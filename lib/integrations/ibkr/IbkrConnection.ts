/**
 * IBKR Gateway Streaming Connection - Phase 2
 *
 * Production-grade socket connection manager for IB Gateway
 * - Handles connection lifecycle
 * - Automatic reconnection with exponential backoff
 * - ClientId rotation on conflict (error 501)
 * - Auto-detect Paper (4001) vs Live (4002) accounts
 * - Heartbeat/timeout detection
 * - Gateway restart detection
 */

import type {
  ConnectionConfig,
  ConnectionState,
  ConnectionStatus,
  IbkrConnectionStatus,
} from "./types";

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
  accountValue: string;
  [key: string]: string;
}

export class IbkrConnection {
  private ib: IBApiInstance | null = null;
  private ibLib: { IB: IBApi; EventName: IBEventName } | null = null;
  private state: ConnectionState = "DISCONNECTED";
  private config: ConnectionConfig;
  private connectPromise: Promise<void> | null = null;
  private connecting: boolean = false;

  // Phase 7: Enhanced status tracking
  private lastConnectTime: number | null = null;
  private lastDisconnectTime: number | null = null;
  private lastError: string | null = null;
  private lastConnectAttemptTs: number | null = null;
  private lastSuccessfulConnectTs: number | null = null;
  private lastIbkrError: { code: number; message: string; ts: number } | null = null;
  private accountType: "PAPER" | "LIVE" | "UNKNOWN" = "UNKNOWN";
  private nextValidOrderId: number | null = null;

  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private maxReconnectDelay: number = 30000; // 30 seconds max
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 60000; // 60 seconds
  private readonly HEARTBEAT_TIMEOUT = 120000; // 2 minutes - if no data for 2 min, reconnect

  private onStateChangeCallbacks: Array<(status: ConnectionStatus) => void> = [];
  private subscribedSymbolsForResubscribe: Set<string> = new Set();

  constructor(config?: Partial<ConnectionConfig>) {
    // Default config
    const defaultPort = parseInt(process.env.IBKR_PORT || "4001", 10);
    this.config = {
      host: config?.host || process.env.IBKR_HOST || "127.0.0.1",
      port: config?.port || defaultPort,
      clientId: config?.clientId || parseInt(process.env.IBKR_CLIENT_ID_DEV || "1", 10),
    };

    // Validate port (must be 4001 or 4002 for IB Gateway)
    if (this.config.port !== 4001 && this.config.port !== 4002) {
      console.warn(
        `[IbkrConnection] ⚠️ Port ${this.config.port} is not standard for IB Gateway. Use 4001 (Paper) or 4002 (Live)`
      );
    }

    this.setupGracefulShutdown();
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return {
      state: this.state,
      port: this.config.port,
      clientId: this.config.clientId,
      accountType: this.accountType,
      lastConnectTime: this.lastConnectTime,
      lastDisconnectTime: this.lastDisconnectTime,
      lastError: this.lastError,
    };
  }

  /**
   * Get enhanced connection status for health monitoring (Phase 7)
   */
  getConnectionStatus(): IbkrConnectionStatus {
    return {
      isConnected: this.state === "CONNECTED",
      lastConnectAttemptTs: this.lastConnectAttemptTs,
      lastSuccessfulConnectTs: this.lastSuccessfulConnectTs,
      lastDisconnectTs: this.lastDisconnectTime,
      lastIbkrError: this.lastIbkrError,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "CONNECTED" && this.ib !== null;
  }

  /**
   * Get the underlying IB API instance (for IbkrMarketData to use)
   */
  getClient(): IBApiInstance {
    if (!this.ib || this.state !== "CONNECTED") {
      throw new Error("IBKR client is not connected. Call connect() first.");
    }
    return this.ib;
  }

  /**
   * Connect to IB Gateway
   */
  async connect(): Promise<void> {
    if (this.state === "CONNECTED") {
      return Promise.resolve();
    }

    if (this.connecting && this.connectPromise) {
      return this.connectPromise;
    }

    this.connecting = true;
    this.setState("CONNECTING");

    // Phase 7: Track connection attempt
    this.lastConnectAttemptTs = Date.now();
    console.log(
      `[IbkrConnection] 🔄 Connection attempt started at ${new Date(this.lastConnectAttemptTs).toISOString()}`
    );

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
        `[IbkrConnection] Connecting to IB Gateway: ${this.config.host}:${this.config.port}, Client ID: ${this.config.clientId}`
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
        if (this.connecting && this.connectPromise) {
          this.connecting = false;
          this.connectPromise = null;
          const error = new Error(
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

        // Phase 7: Track successful connection
        const connectTime = Date.now();
        this.lastConnectTime = connectTime;
        this.lastSuccessfulConnectTs = connectTime;
        this.lastIbkrError = null; // Clear previous errors on successful connection
        this.setState("CONNECTED");
        this.startHeartbeat();

        console.log(
          `[IbkrConnection] ✅ Connected to IB Gateway at ${new Date(connectTime).toISOString()}! ` +
            `Order ID: ${orderId}, Account Type: ${this.accountType}`
        );
        resolve();
      };

      // Handle connection errors
      const onError = (err: Error, code: number) => {
        // Phase 7: Track IBKR errors
        const errorTs = Date.now();
        this.lastIbkrError = { code, message: err.message, ts: errorTs };
        console.error(
          `[IbkrConnection] ❌ IBKR Error [${code}] at ${new Date(errorTs).toISOString()}: ${err.message}`
        );

        if (this.connecting && this.connectPromise) {
          clearTimeout(timeout);
          this.connecting = false;
          this.connectPromise = null;

          // Handle clientId conflict (error 501)
          if (code === 501 || err.message.includes("client id is already in use")) {
            console.warn(
              `[IbkrConnection] ⚠️ Client ID ${this.config.clientId} is already in use. Rotating to next ID...`
            );

            // Rotate clientId (increment, max 32767)
            const newClientId = Math.min((this.config.clientId || 1) + 1, 32767);
            this.config.clientId = newClientId;

            // Clean up and retry
            try {
              if (this.ib) {
                this.ib.removeAllListeners();
                this.ib.disconnect();
              }
              this.ib = null;
              this.connecting = false;
              this.connectPromise = null;

              // Retry with new clientId after a short delay
              setTimeout(async () => {
                try {
                  await this.connect();
                  resolve();
                } catch (retryError) {
                  reject(retryError);
                }
              }, 1000);
              return; // Don't reject here - we're retrying
            } catch (retryErr) {
              // If retry setup fails, reject
              const error = new Error(`Failed to rotate client ID: ${String(retryErr)}`);
              this.setError(error.message);
              this.setState("ERROR");
              reject(error);
            }
            return;
          }

          // Other connection errors
          let errorMessage = err.message;
          if (code === 502) {
            errorMessage = `Connection refused. Ensure IB Gateway is running on ${this.config.host}:${this.config.port}`;
          } else if (code === 504) {
            errorMessage = `Connection timeout. IB Gateway is not responding.`;
          }

          const error = new Error(errorMessage);
          this.setError(errorMessage);
          this.setState("ERROR");
          this.scheduleReconnect();
          reject(error);
        }
      };

      // Use 'once' for connection-specific handlers
      this.ib.once(lib.EventName.nextValidId, onNextValidId);
      this.ib.once(lib.EventName.error, onError);

      // Start connection
      try {
        this.ib.connect();
      } catch (error) {
        clearTimeout(timeout);
        this.connecting = false;
        this.connectPromise = null;
        const err = error instanceof Error ? error : new Error(String(error));
        const connectionError = new Error(`Failed to start connection: ${err.message}`);
        this.setError(err.message);
        this.setState("ERROR");
        reject(connectionError);
      }
    });

    return this.connectPromise;
  }

  /**
   * Disconnect from IB Gateway
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.cancelReconnect();

    if (this.ib) {
      try {
        console.log(`[IbkrConnection] Disconnecting...`);
        this.ib.removeAllListeners();
        this.ib.disconnect();
      } catch (e) {
        // Ignore errors
      }
      this.ib = null;
    }

    this.connecting = false;
    this.connectPromise = null;

    // Phase 7: Track disconnect
    const disconnectTime = Date.now();
    this.lastDisconnectTime = disconnectTime;
    console.warn(
      `[IbkrConnection] 🔌 Disconnected from IB Gateway at ${new Date(disconnectTime).toISOString()}`
    );

    this.setState("DISCONNECTED");
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback: (status: ConnectionStatus) => void): () => void {
    this.onStateChangeCallbacks.push(callback);
    return () => {
      const index = this.onStateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onStateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Mark a symbol as subscribed (for resubscription after reconnect)
   */
  markSymbolSubscribed(symbol: string): void {
    this.subscribedSymbolsForResubscribe.add(symbol.toUpperCase());
  }

  /**
   * Unmark a symbol as subscribed
   */
  unmarkSymbolSubscribed(symbol: string): void {
    this.subscribedSymbolsForResubscribe.delete(symbol.toUpperCase());
  }

  /**
   * Get list of symbols that need resubscription
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbolsForResubscribe);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureIBLib(): { IB: IBApi; EventName: IBEventName } {
    if (!this.ibLib) {
      const ib = require("@stoqey/ib");
      const IBApiClass = ib.IBApi || ib.default?.IBApi || ib.default;

      if (!IBApiClass) {
        throw new Error(
          "IBApi class not found in @stoqey/ib. Package may not be installed correctly."
        );
      }

      this.ibLib = {
        IB: IBApiClass,
        EventName: ib.EventName || {},
      };

      console.log(`[IbkrConnection] ✅ Loaded @stoqey/ib library`);
    }
    return this.ibLib;
  }

  private setupPersistentHandlers(lib: { IB: IBApi; EventName: IBEventName }): void {
    if (!this.ib) return;

    // Handle account type detection
    this.ib.on(
      lib.EventName.accountValue,
      (key: string, val: string, currency: string, accountName: string) => {
        // Detect account type: "DU" prefix = Paper Trading
        if (accountName && accountName.startsWith("DU")) {
          this.accountType = "PAPER";
          // Switch to port 4001 if not already
          if (this.config.port !== 4001) {
            console.log(
              `[IbkrConnection] 📊 Detected PAPER account. Switching from port ${this.config.port} to 4001...`
            );
            // Note: We'll handle port switching on next reconnect
            this.config.port = 4001;
          }
          console.log(`[IbkrConnection] 📊 Account Type: PAPER (Account: ${accountName})`);
        } else if (accountName && !this.accountType) {
          // If account name doesn't start with DU, assume LIVE
          if (key === "AccountType" || key === "AccountCode") {
            this.accountType = "LIVE";
            // Switch to port 4002 if not already
            if (this.config.port !== 4002) {
              console.log(
                `[IbkrConnection] 📊 Detected LIVE account. Switching from port ${this.config.port} to 4002...`
              );
              this.config.port = 4002;
            }
            console.log(`[IbkrConnection] 📊 Account Type: LIVE (Account: ${accountName})`);
          }
        }
        this.notifyStateChange();
      }
    );

    // Handle disconnection
    this.ib.on(lib.EventName.disconnected, () => {
      console.log(`[IbkrConnection] ⚠️ Disconnected from IB Gateway`);
      this.lastDisconnectTime = Date.now();
      this.stopHeartbeat();
      this.setState("DISCONNECTED");

      // Schedule reconnection
      this.scheduleReconnect();
    });

    // Handle next valid ID updates
    this.ib.on(lib.EventName.nextValidId, (orderId: number) => {
      this.nextValidOrderId = orderId;
    });

    // Handle errors (general error handler)
    this.ib.on(lib.EventName.error, (err: Error, code: number) => {
      // Log specific IBKR codes
      this.handleIBKRCode(code, err);

      // Handle connection-related errors
      if (code === 502 || code === 504) {
        this.setError(err.message);
        this.setState("ERROR");
        this.scheduleReconnect();
      } else if (code === 10053) {
        // Server reset / pacing violation
        console.warn(`[IbkrConnection] ⚠️ Server reset detected (code 10053). Reconnecting...`);
        this.scheduleReconnect();
      }
    });
  }

  private handleIBKRCode(code: number, err: Error): void {
    // Log important IBKR codes
    switch (code) {
      case 2104:
        console.log(`[IbkrConnection] ✅ Farm connection OK (code 2104)`);
        break;
      case 2106:
        console.log(`[IbkrConnection] ✅ Farm connection OK (code 2106)`);
        break;
      case 2158:
        console.log(`[IbkrConnection] ✅ Farm connection OK (code 2158)`);
        break;
      case 10053:
        console.warn(`[IbkrConnection] ⚠️ Server reset / pacing violation (code 10053)`);
        break;
      case 10089:
        console.warn(
          `[IbkrConnection] ⚠️ No market data subscription (code 10089). Real-time data requires a subscription.`
        );
        break;
      case 10147:
      case 10148:
        console.error(
          `[IbkrConnection] ❌ Invalid permissions for market data (code ${code}). Check your IBKR account permissions.`
        );
        break;
      default:
        // Only log non-connection errors as warnings
        if (code !== 502 && code !== 504 && code !== 501) {
          console.warn(`[IbkrConnection] ⚠️ IBKR error (code ${code}): ${err.message}`);
        }
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyStateChange();
    }
  }

  private setError(error: string): void {
    this.lastError = error;
    console.error(`[IbkrConnection] Error: ${error}`);
  }

  private notifyStateChange(): void {
    const status = this.getStatus();
    this.onStateChangeCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (e) {
        console.error(`[IbkrConnection] Error in state change callback:`, e);
      }
    });
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
      `[IbkrConnection] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms...`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.state !== "CONNECTED" && this.state !== "CONNECTING") {
        console.log(`[IbkrConnection] Attempting reconnection...`);
        this.connect().catch((err) => {
          console.error(`[IbkrConnection] Reconnection attempt failed:`, err);
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

  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Reset heartbeat timeout on any activity
    const resetHeartbeatTimeout = () => {
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
      }
      this.heartbeatTimeout = setTimeout(() => {
        console.warn(
          `[IbkrConnection] ⚠️ Heartbeat timeout - no activity for ${this.HEARTBEAT_TIMEOUT}ms. Reconnecting...`
        );
        this.disconnect();
        this.scheduleReconnect();
      }, this.HEARTBEAT_TIMEOUT);
    };

    // Send keep-alive every HEARTBEAT_INTERVAL
    this.heartbeatInterval = setInterval(() => {
      if (this.ib && this.state === "CONNECTED") {
        try {
          // Use reqAccountUpdates as lightweight keep-alive
          (this.ib as any).reqAccountUpdates(true, "");
          resetHeartbeatTimeout();
        } catch (e) {
          console.warn(`[IbkrConnection] Heartbeat failed:`, e);
        }
      }
    }, this.HEARTBEAT_INTERVAL);

    // Initial timeout
    resetHeartbeatTimeout();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = () => {
      console.log(`[IbkrConnection] Graceful shutdown: disconnecting...`);
      this.disconnect();
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }
}

/**
 * Singleton instance for IbkrConnection
 * Phase 7: Exported for health monitoring
 */
let connectionInstance: IbkrConnection | null = null;

/**
 * Get or create the singleton IbkrConnection instance
 * Phase 7: For use in health API and other server-side code
 */
export function getIbkrConnection(config?: Partial<ConnectionConfig>): IbkrConnection {
  if (!connectionInstance) {
    connectionInstance = new IbkrConnection(config);
    console.log(`[IbkrConnection] Created singleton instance`);
  }
  return connectionInstance;
}
