/**
 * IBKR Integration Layer - Connection Manager (Singleton)
 *
 * Manages a single, persistent connection to IB Gateway/TWS
 * - Prevents multiple clients with same clientId
 * - Handles reconnection with exponential backoff
 * - Provides connection status tracking
 * - Graceful shutdown on process exit
 */

import { getIbkrEventBus } from "./events";
import type {
  ConnectionConfig,
  ConnectionState,
  ConnectionStatus,
  IbkrConnectionError,
} from "./types";
import { IbkrConnectionError as ConnectionError } from "./types";

interface IBApi {
  new (config: { clientId: number; host: string; port: number }): IBApiInstance;
}

interface IBApiInstance {
  connect(): void;
  disconnect(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  once(event: string, callback: (...args: unknown[]) => void): void;
  removeAllListeners(event?: string): void;
  [key: string]: unknown;
}

interface IBEventName {
  nextValidId: string;
  connected: string;
  disconnected: string;
  error: string;
  [key: string]: string;
}

export class IbkrConnectionManager {
  private static instance: IbkrConnectionManager | null = null;

  private ib: IBApiInstance | null = null;
  private ibLib: { IB: IBApi; EventName: IBEventName } | null = null;
  private state: ConnectionState = "DISCONNECTED";
  private config: ConnectionConfig;
  private connectPromise: Promise<void> | null = null;
  private connecting: boolean = false;

  private lastConnectTime: number | null = null;
  private lastDisconnectTime: number | null = null;
  private lastError: string | null = null;
  private serverTime: string | null = null;

  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectDelay: number = 30000; // 30 seconds max
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private nextValidOrderId: number | null = null;

  private eventBus = getIbkrEventBus();

  private constructor(config: ConnectionConfig) {
    this.config = config;
    this.setupGracefulShutdown();
  }

  /**
   * Get the singleton connection manager instance
   */
  static getInstance(config?: Partial<ConnectionConfig>): IbkrConnectionManager {
    if (!IbkrConnectionManager.instance) {
      // Generate a unique Client ID to avoid "client id is already in use" errors
      // Use timestamp-based ID (last 8 digits) to ensure uniqueness across restarts
      // This allows multiple instances/restarts without conflicts
      const generateUniqueClientId = (): number => {
        // Use timestamp mod 100000000 to get a reasonable client ID (0-99999999)
        // This ensures uniqueness across restarts while staying within IB's valid range
        const timestampBased = Date.now() % 100000000;

        // If environment variable is set, use it (useful for testing/debugging)
        if (process.env.IBKR_CLIENT_ID) {
          return parseInt(process.env.IBKR_CLIENT_ID, 10);
        }

        // Prefer environment-specific settings if provided
        if (process.env.NODE_ENV === "production" && process.env.IBKR_CLIENT_ID_PROD) {
          return parseInt(process.env.IBKR_CLIENT_ID_PROD, 10);
        }

        if (process.env.NODE_ENV !== "production" && process.env.IBKR_CLIENT_ID_DEV) {
          return parseInt(process.env.IBKR_CLIENT_ID_DEV, 10);
        }

        // Default to timestamp-based unique ID
        return timestampBased;
      };

      const defaultConfig: ConnectionConfig = {
        host: process.env.IBKR_HOST || "127.0.0.1",
        port: parseInt(process.env.IBKR_PORT || "4001", 10),
        clientId: generateUniqueClientId(),
      };

      const finalConfig: ConnectionConfig = {
        ...defaultConfig,
        ...config,
      };

      IbkrConnectionManager.instance = new IbkrConnectionManager(finalConfig);
      console.log(
        `[IBKR Connection] ✅ Created connection manager with Client ID: ${finalConfig.clientId}`
      );
    }
    return IbkrConnectionManager.instance;
  }

  /**
   * Get connection manager (alias for getInstance for consistency)
   */
  static getConnectionManager(config?: Partial<ConnectionConfig>): IbkrConnectionManager {
    return IbkrConnectionManager.getInstance(config);
  }

  /**
   * Ensure the connection is established
   * @throws IbkrConnectionError if connection fails
   */
  async ensureConnected(): Promise<void> {
    if (this.state === "CONNECTED") {
      return;
    }

    if (this.connecting && this.connectPromise) {
      return this.connectPromise;
    }

    return this.connect();
  }

  /**
   * Connect to IB Gateway/TWS
   * @throws IbkrConnectionError if connection fails
   */
  private async connect(): Promise<void> {
    if (this.connecting && this.connectPromise) {
      return this.connectPromise;
    }

    if (this.state === "CONNECTED") {
      return Promise.resolve();
    }

    this.connecting = true;
    this.setState("CONNECTING");

    this.connectPromise = new Promise((resolve, reject) => {
      const lib = this.ensureIBLib();

      // Clean up any existing instance
      if (this.ib) {
        try {
          this.ib.removeAllListeners();
          this.ib.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.ib = null;
      }

      // Create new IB instance
      console.log(
        `[IBKR Connection] Creating IB instance: ${this.config.host}:${this.config.port}, Client ID: ${this.config.clientId}`
      );
      this.ib = new lib.IB({
        clientId: this.config.clientId,
        host: this.config.host,
        port: this.config.port,
      });

      // Set up persistent handlers
      this.setupPersistentHandlers(lib);

      // Set up connection timeout
      const timeout = setTimeout(() => {
        if (this.connecting) {
          this.connecting = false;
          this.connectPromise = null;
          const error = new ConnectionError(
            `Connection timeout after 25 seconds. Is IB Gateway running on ${this.config.host}:${this.config.port}?`
          );
          this.setError(error.message);
          this.setState("ERROR");
          reject(error);
        }
      }, 25000);

      // Handle successful connection
      const onNextValidId = (orderId: number) => {
        clearTimeout(timeout);
        this.nextValidOrderId = orderId;
        this.connecting = false;
        this.connectPromise = null;
        this.reconnectAttempts = 0; // Reset on successful connection

        this.lastConnectTime = Date.now();
        this.setState("CONNECTED");

        // Start keep-alive
        this.startKeepAlive();

        console.log(`[IBKR Connection] ✅ Connected! Order ID: ${orderId}`);
        resolve();
      };

      // Handle connection errors
      const onError = (err: Error, code: number) => {
        if (!this.state || this.state === "CONNECTING") {
          clearTimeout(timeout);
          this.connecting = false;
          this.connectPromise = null;

          let errorMessage = err.message;
          let shouldRetryWithNewClientId = false;

          if (code === 502) {
            errorMessage = `Connection refused. Ensure IB Gateway is running and API is enabled (Settings → API → Settings → Enable ActiveX and Socket Clients)`;
          } else if (code === 504) {
            errorMessage = `Connection timeout. IB Gateway is not responding on ${this.config.host}:${this.config.port}`;
          } else if (err.message.includes("client id is already in use")) {
            // Client ID conflict - generate a new unique ID and retry
            const oldClientId = this.config.clientId;
            this.config.clientId = (Date.now() % 100000000) + Math.floor(Math.random() * 1000);
            errorMessage = `Client ID ${oldClientId} was already in use. Retrying with new Client ID: ${this.config.clientId}`;
            shouldRetryWithNewClientId = true;
            console.log(`[IBKR Connection] 🔄 ${errorMessage}`);
          }

          const error = new ConnectionError(errorMessage, code, err);
          this.setError(errorMessage);
          this.setState("ERROR");

          // If client ID conflict, retry immediately with new ID
          if (shouldRetryWithNewClientId) {
            // Retry connection with new Client ID after a short delay
            setTimeout(() => {
              console.log(
                `[IBKR Connection] Retrying connection with new Client ID: ${this.config.clientId}`
              );
              this.connect().catch((retryErr) => {
                console.error(`[IBKR Connection] Retry with new Client ID failed:`, retryErr);
              });
            }, 1000); // 1 second delay before retry
          } else {
            // Trigger normal reconnection attempt
            this.scheduleReconnect();
          }

          reject(error);
        }
      };

      // Use 'once' for connection-specific handlers
      this.ib.once(lib.EventName.nextValidId, onNextValidId);
      this.ib.once(lib.EventName.error, onError);

      // Start connection
      try {
        console.log(`[IBKR Connection] Attempting connection...`);
        this.ib.connect();
      } catch (error) {
        clearTimeout(timeout);
        this.connecting = false;
        this.connectPromise = null;
        const err = error instanceof Error ? error : new Error(String(error));
        const connectionError = new ConnectionError(
          `Failed to start connection: ${err.message}`,
          undefined,
          err
        );
        this.setError(err.message);
        this.setState("ERROR");
        reject(connectionError);
      }
    });

    return this.connectPromise;
  }

  /**
   * Disconnect from IB Gateway/TWS
   */
  disconnect(): void {
    this.stopKeepAlive();
    this.cancelReconnect();

    if (this.ib) {
      try {
        console.log(`[IBKR Connection] Disconnecting...`);
        this.ib.removeAllListeners();
        this.ib.disconnect();
      } catch (e) {
        // Ignore errors
      }
      this.ib = null;
    }

    this.connecting = false;
    this.connectPromise = null;
    this.lastDisconnectTime = Date.now();
    this.setState("DISCONNECTED");
  }

  /**
   * Get the underlying IB client instance
   * @throws IbkrConnectionError if not connected
   */
  getClient(): IBApiInstance {
    if (!this.ib || this.state !== "CONNECTED") {
      throw new ConnectionError("IBKR client is not connected. Call ensureConnected() first.");
    }
    return this.ib;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return {
      state: this.state,
      lastConnectTime: this.lastConnectTime,
      lastDisconnectTime: this.lastDisconnectTime,
      lastError: this.lastError,
      serverTime: this.serverTime,
      clientId: this.config.clientId,
      host: this.config.host,
      port: this.config.port,
    };
  }

  /**
   * Get next valid order ID (for order placement)
   */
  getNextValidOrderId(): number {
    if (this.nextValidOrderId === null) {
      throw new ConnectionError(
        "Next valid order ID not available. Connection may not be established yet."
      );
    }
    return this.nextValidOrderId;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === "CONNECTED" && this.ib !== null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureIBLib(): { IB: IBApi; EventName: IBEventName } {
    if (!this.ibLib) {
      const ib = require("@stoqey/ib");

      // @stoqey/ib exports IBApi, not IB
      const IBApiClass = ib.IBApi || ib.default?.IBApi || ib.default;

      if (!IBApiClass) {
        throw new ConnectionError(
          "IBApi class not found in @stoqey/ib. Package may not be installed correctly."
        );
      }

      this.ibLib = {
        IB: IBApiClass,
        EventName: ib.EventName || {},
      };

      console.log(`[IBKR Connection] ✅ Loaded @stoqey/ib library`);
    }
    return this.ibLib;
  }

  private setupPersistentHandlers(lib: { IB: IBApi; EventName: IBEventName }): void {
    if (!this.ib) return;

    // Handle disconnection
    this.ib.on(lib.EventName.disconnected, () => {
      console.log(`[IBKR Connection] ⚠️ Disconnected from IB Gateway`);
      this.lastDisconnectTime = Date.now();
      this.stopKeepAlive();
      this.setState("DISCONNECTED");

      // Schedule reconnection
      this.scheduleReconnect();
    });

    // Handle next valid ID updates (order ID increments)
    this.ib.on(lib.EventName.nextValidId, (orderId: number) => {
      this.nextValidOrderId = orderId;
    });

    // Handle errors (general error handler, separate from connection errors)
    this.ib.on(lib.EventName.error, (err: Error, code: number) => {
      // Log errors but don't disconnect unless it's a connection error
      if (code === 502 || code === 504) {
        console.error(`[IBKR Connection] ❌ Connection error:`, err.message);
        this.setError(err.message);
        this.setState("ERROR");
        this.scheduleReconnect();
      } else if (err.message.includes("client id is already in use")) {
        // Client ID conflict - generate new ID and retry
        const oldClientId = this.config.clientId;
        this.config.clientId = (Date.now() % 100000000) + Math.floor(Math.random() * 1000);
        console.error(
          `[IBKR Connection] ❌ Client ID ${oldClientId} conflict. Switching to Client ID: ${this.config.clientId}`
        );
        this.setError(`Client ID conflict. Using new ID: ${this.config.clientId}`);
        this.setState("ERROR");

        // Retry with new Client ID after a short delay
        setTimeout(() => {
          console.log(
            `[IBKR Connection] Retrying connection with new Client ID: ${this.config.clientId}`
          );
          this.connect().catch((retryErr) => {
            console.error(`[IBKR Connection] Retry with new Client ID failed:`, retryErr);
          });
        }, 1000);
      } else {
        console.warn(`[IBKR Connection] ⚠️ IBKR error (code ${code}):`, err.message);
      }
    });
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;

      // Emit state change event
      this.eventBus.emitConnectionStateChange(this.getStatus());
    }
  }

  private setError(error: string): void {
    this.lastError = error;
    console.error(`[IBKR Connection] Error: ${error}`);
  }

  private scheduleReconnect(): void {
    if (this.state === "CONNECTING" || this.state === "CONNECTED") {
      return; // Don't reconnect if already connecting/connected
    }

    this.cancelReconnect();

    const delay = Math.min(
      2 ** this.reconnectAttempts * 1000, // Exponential backoff: 1s, 2s, 4s, 8s...
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(
      `[IBKR Connection] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms...`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.state !== "CONNECTED" && this.state !== "CONNECTING") {
        console.log(`[IBKR Connection] Attempting reconnection...`);
        this.connect().catch((err) => {
          console.error(`[IBKR Connection] Reconnection attempt failed:`, err);
        });
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();

    // Send keep-alive every 20 seconds to prevent inactivity disconnects
    this.keepAliveInterval = setInterval(() => {
      if (this.ib && this.state === "CONNECTED") {
        try {
          // reqAccountUpdates is a lightweight keep-alive request
          // Using empty string for account means all accounts
          (this.ib as any).reqAccountUpdates(true, "");
        } catch (e) {
          console.warn(`[IBKR Connection] Keep-alive failed:`, e);
        }
      }
    }, 20000); // 20 seconds
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = () => {
      console.log(`[IBKR Connection] Graceful shutdown: disconnecting...`);
      this.disconnect();
    };

    // Handle process exit
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }
}

/**
 * Get the singleton connection manager instance
 */
export function getIbkrConnectionManager(
  config?: Partial<ConnectionConfig>
): IbkrConnectionManager {
  return IbkrConnectionManager.getInstance(config);
}
