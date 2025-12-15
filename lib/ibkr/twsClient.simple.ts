// Simplified TWS Client for Interactive Brokers
import type { IbkrHistoricalBar, IbkrMarketDataSnapshot } from "@/lib/types/ibkr";

interface TwsConfig {
  host?: string;
  port?: number;
  clientId?: number;
}

export class TwsClient {
  private ib: any = null;
  private ibLib: any = null;
  private connected: boolean = false;
  private connecting: boolean = false;
  private connectPromise: Promise<void> | null = null;
  private config: Required<TwsConfig>;
  private accountType: "PAPER" | "LIVE" | "UNKNOWN" | null = null; // Store account type like Python code
  private nextValidOrderId: number | null = null; // Store next valid order ID
  private keepAliveInterval: NodeJS.Timeout | null = null; // Keep-alive timer
  private reconnectTimeout: NodeJS.Timeout | null = null; // Reconnection timer
  private lastActivityTime: number = 0; // Track last activity to prevent inactivity disconnects

  constructor(config: TwsConfig = {}) {
    // Generate unique clientId if not provided
    // IB Gateway requires client IDs between 0 and 32767 (16-bit signed integer)
    // Use modulo to ensure it's in valid range
    const defaultClientId =
      config.clientId !== undefined
        ? config.clientId
        : Math.floor(Date.now() % 32767) + Math.floor(Math.random() * 100);

    // Ensure clientId is in valid range (0-32767)
    const validClientId = Math.max(0, Math.min(32767, defaultClientId));

    // Use port 4001 for Paper Trading, 4002 for Live Trading (IB Gateway)
    // Fallback to 7497 (Paper) / 7496 (Live) if specified for TWS
    const defaultPort = config.port || 4002; // Default to Live Trading port

    this.config = {
      host: config.host || "127.0.0.1",
      port: defaultPort,
      clientId: validClientId,
    };
  }

  private ensureIBLib() {
    if (!this.ibLib) {
      const ib = require("@stoqey/ib");
      // @stoqey/ib exports IBApi, not IB!
      const IBApiClass = ib.IBApi || ib.default?.IBApi || ib.default;

      if (!IBApiClass) {
        throw new Error(
          "IBApi class not found in @stoqey/ib. Package may not be installed correctly."
        );
      }

      this.ibLib = {
        IB: IBApiClass, // Store as IB for backwards compatibility in code
        EventName: ib.EventName,
        ErrorCode: ib.ErrorCode,
        SecType: ib.SecType,
        BarSizeSetting: ib.BarSizeSetting,
        WhatToShow: ib.WhatToShow,
      };

      console.log(`[TWS Client] ✅ Loaded @stoqey/ib library`);
      console.log(`[TWS Client]    IBApi class: ${IBApiClass.name}`);
      console.log(`[TWS Client]    EventName: ${!!this.ibLib.EventName}`);
    }
    return this.ibLib;
  }

  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.connected) {
      console.log(`✅ [TWS Client] Already connected, skipping...`);
      return Promise.resolve();
    }

    // If connection is in progress, return the existing promise
    if (this.connecting && this.connectPromise) {
      console.log(`⏳ [TWS Client] Connection already in progress, waiting...`);
      return this.connectPromise;
    }

    const lib = this.ensureIBLib();

    // If IB instance exists but not connected, clean it up
    if (this.ib && !this.connected) {
      console.log(`🧹 [TWS Client] Cleaning up existing disconnected instance...`);
      try {
        // Remove all listeners to prevent memory leaks
        this.ib.removeAllListeners();
        this.ib.disconnect();
        // Wait a bit for IB Gateway to release the Client ID
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore errors if already disconnected
        console.warn(`⚠️ [TWS Client] Error during cleanup:`, e);
      }
      this.ib = null;
    }

    // Mark as connecting and create promise
    this.connecting = true;
    console.log(`🚀 [TWS Client] Starting connection process...`);
    this.connectPromise = new Promise((resolve, reject) => {
      // Create new IB instance with unique clientId
      if (!this.ib) {
        console.log(`🔌 [TWS Client] Creating new IB instance:`);
        console.log(`   📍 Host: ${this.config.host}`);
        console.log(
          `   🔌 Port: ${this.config.port} ${this.config.port === 4001 ? "(Paper Trading)" : this.config.port === 4002 ? "(Live Trading)" : ""}`
        );
        console.log(`   🆔 Client ID: ${this.config.clientId}`);
        this.ib = new lib.IB({
          clientId: this.config.clientId,
          host: this.config.host,
          port: this.config.port,
        });

        // Set up persistent event handlers (only once when creating new instance)
        this.setupPersistentHandlers(lib);
      } else {
        console.log(`♻️  [TWS Client] Reusing existing IB instance`);
      }

      // Set up connection timeout (wait for nextValidId, which can take longer)
      const timeout = setTimeout(() => {
        if (this.connecting && this.connectPromise) {
          this.connecting = false;
          this.connectPromise = null;
          console.error(`❌ [TWS Client] Connection timeout after 25 seconds`);
          console.error(`   📍 Tried: ${this.config.host}:${this.config.port}`);
          console.error(`   💡 Make sure IB Gateway is running and API is enabled`);
          reject(
            new Error(
              `Connection timeout after 25 seconds - Is IB Gateway running on port ${this.config.port}? Make sure API is enabled.`
            )
          );
        }
      }, 25000); // 25 seconds timeout

      // Handle nextValidId - this confirms full connection (CRITICAL)
      // Use 'once' for this specific connection attempt
      const onNextValidId = (orderId: number) => {
        clearTimeout(timeout);
        this.nextValidOrderId = orderId;
        console.log(`✅ [TWS Client] Received nextValidId! Order ID: ${orderId}`);
        console.log(`✅ [TWS Client] Connection fully established!`);

        if (this.connecting && this.connectPromise) {
          this.connected = true;
          this.connecting = false;
          this.connectPromise = null;
          this.lastActivityTime = Date.now();

          // Start keep-alive mechanism to prevent inactivity disconnects
          this.startKeepAlive();

          // Request account updates to detect account type
          setTimeout(() => {
            try {
              if (this.ib && this.connected) {
                this.ib.reqAccountUpdates(true, ""); // true = subscribe, "" = all accounts
                console.log(`📊 [TWS Client] Requested account updates to detect account type...`);
                this.lastActivityTime = Date.now();
              }
            } catch (e) {
              console.warn(`⚠️ [TWS Client] Failed to request account updates:`, e);
            }
          }, 500); // Small delay to ensure connection is stable

          resolve();
        }
      };

      // Handle connection errors for this specific connection attempt
      const errorHandler = (err: Error, code: number) => {
        if (!this.connected && this.connecting && this.connectPromise) {
          clearTimeout(timeout);
          this.connecting = false;
          const savedConnectPromise = this.connectPromise;
          this.connectPromise = null;

          // Detailed error messages
          let errorMessage = err.message;
          if (code === 502) {
            errorMessage =
              `Connection refused to ${this.config.host}:${this.config.port}. ` +
              `Please ensure IB Gateway is running and API is enabled. ` +
              `Check Settings → API → Settings → Enable ActiveX and Socket Clients.`;
          } else if (code === 504) {
            errorMessage =
              `Connection timeout to ${this.config.host}:${this.config.port}. ` +
              `IB Gateway is not responding. Make sure it's fully connected (not just started).`;
          } else if (err.message.includes("client id is already in use")) {
            // If Client ID is in use, try with a different Client ID (increment)
            const oldClientId = this.config.clientId || 1;
            const newClientId = oldClientId + 1;
            console.warn(
              `⚠️ [TWS Client] Client ID ${oldClientId} is already in use. Trying Client ID ${newClientId}...`
            );

            // Update config and retry with new Client ID
            this.config.clientId = newClientId;

            // Clean up and retry
            try {
              if (this.ib) {
                this.ib.removeAllListeners();
                this.ib.disconnect();
              }
              this.ib = null;
              this.connected = false;

              // Wait a bit for IB Gateway to release the Client ID, then retry
              setTimeout(async () => {
                try {
                  // Retry connection with new Client ID
                  await this.connect();
                  // Connection succeeded with new Client ID
                  // Note: The promise is resolved by onNextValidId handler
                } catch (retryError) {
                  // If retry also fails, we can't reject savedConnectPromise here
                  // The error will be logged and connection will fail naturally
                  console.error(
                    `❌ [TWS Client] Retry with Client ID ${newClientId} also failed:`,
                    retryError
                  );
                }
              }, 1500); // Wait 1.5 seconds before retry to ensure IB Gateway released the Client ID
              return; // Don't reject here - we're retrying
            } catch (retryErr) {
              errorMessage =
                `Client ID ${oldClientId} is already in use and retry setup failed. ` +
                `Close other applications using IB Gateway or restart IB Gateway.`;
              reject(new Error(errorMessage));
            }
          }

          // Reject on critical connection errors (but not client ID in use - we retry above)
          if (code === 502 || code === 504) {
            console.error(`❌ [TWS Client] Connection failed: ${errorMessage}`);
            reject(new Error(`Failed to connect to IB Gateway: ${errorMessage} (code: ${code})`));
          }
        }
      };

      // Use 'once' for connection-specific handlers (resolve/reject the promise)
      // These handlers are removed after firing once
      this.ib.once(lib.EventName.nextValidId, onNextValidId);
      this.ib.once(lib.EventName.error, errorHandler);

      // Start connection
      try {
        console.log(`🚀 [TWS Client] Calling ib.connect()...`);
        this.ib.connect();
        console.log(`⏳ [TWS Client] Connection call completed, waiting for nextValidId...`);
      } catch (error) {
        clearTimeout(timeout);
        this.connecting = false;
        this.connectPromise = null;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [TWS Client] Failed to call ib.connect():`, errorMsg);
        console.error(`   Stack:`, error instanceof Error ? error.stack : "N/A");
        reject(new Error(`Failed to start connection: ${errorMsg}`));
      }
    });

    return this.connectPromise;
  }

  /**
   * Set up persistent event handlers for the IB instance
   * These handlers persist for the lifetime of the connection
   */
  private setupPersistentHandlers(lib: any): void {
    if (!this.ib) return;

    // Handle 'connected' event (fires early, before nextValidId)
    this.ib.on(lib.EventName.connected, () => {
      console.log(`✅ [TWS Client] Socket connected to IB Gateway!`);
      console.log(`   📍 Connection: ${this.config.host}:${this.config.port}`);
      console.log(`   🆔 Client ID: ${this.config.clientId}`);
      console.log(`   ⏳ Waiting for nextValidId to confirm full connection...`);
    });

    // Handle account value updates (for account type detection)
    this.ib.on(
      lib.EventName.accountValue,
      (key: string, val: string, currency: string, accountName: string) => {
        // Detect account type based on account name (DU prefix = Paper Trading)
        if (accountName && accountName.startsWith("DU")) {
          this.accountType = "PAPER";
          console.log(`\n======== ACCOUNT DETECTED ========`);
          console.log(`Account Name: ${accountName}`);
          console.log(`Account Type: ${this.accountType}`);
          console.log(`==================================\n`);
        } else if (accountName && !this.accountType) {
          // If account name doesn't start with DU, assume LIVE
          if (key === "AccountType" || key === "AccountCode") {
            this.accountType = "LIVE";
            console.log(`\n======== ACCOUNT DETECTED ========`);
            console.log(`Account Name: ${accountName}`);
            console.log(`Account Type: ${this.accountType}`);
            console.log(`==================================\n`);
          }
        }
      }
    );

    // Handle disconnection
    this.ib.on(lib.EventName.disconnected, () => {
      console.log(`❌ [TWS Client] Disconnected from IB Gateway`);
      console.log(`   📍 Was connected to: ${this.config.host}:${this.config.port}`);
      console.log(`   🆔 Client ID: ${this.config.clientId}`);

      // Stop keep-alive when disconnected
      this.stopKeepAlive();

      // Clear reconnection timeout if exists
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      this.connected = false;
      this.connecting = false;
      if (this.connectPromise) {
        this.connectPromise = null;
      }

      // Schedule automatic reconnection after a short delay
      // Only reconnect if this was an unexpected disconnection (not from disconnect() call)
      if (this.ib) {
        console.log(`🔄 [TWS Client] Scheduling automatic reconnection in 5 seconds...`);
        this.reconnectTimeout = setTimeout(() => {
          if (this.ib && !this.connected && !this.connecting) {
            console.log(`🔄 [TWS Client] Attempting automatic reconnection...`);
            this.connect().catch((err) => {
              console.warn(`⚠️ [TWS Client] Automatic reconnection failed:`, err);
            });
          }
        }, 5000); // Wait 5 seconds before reconnecting
      }
    });

    // Handle general errors (log but don't reject unless it's a connection error)
    this.ib.on(lib.EventName.error, (err: Error, code: number) => {
      console.error(`❌ [TWS Client] IB Gateway Error [${code}]:`, err.message);
      console.error(`   📍 Connection: ${this.config.host}:${this.config.port}`);
      console.error(`   🆔 Client ID: ${this.config.clientId}`);

      // Common error codes and their meanings
      if (code === 502) {
        console.error(
          `   💡 Error 502: Connection refused - IB Gateway not running or API not enabled`
        );
      } else if (code === 504) {
        console.error(`   💡 Error 504: Connection timeout - IB Gateway not responding`);
      } else if (code === 1100) {
        console.error(`   💡 Error 1100: Connectivity between IB and TWS has been lost`);
      } else if (code === 1101) {
        console.error(`   💡 Error 1101: Connectivity between IB and TWS has been restored`);
      }
    });
  }

  disconnect(): void {
    // Stop keep-alive and prevent reconnection
    this.stopKeepAlive();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ib && (this.connected || this.connecting)) {
      try {
        console.log(`🔌 [TWS Client] Disconnecting clientId: ${this.config.clientId}`);
        // Clear IB instance BEFORE disconnect to prevent reconnect handler from firing
        const ibToDisconnect = this.ib;
        this.ib = null;
        ibToDisconnect.disconnect();
      } catch (e) {
        // Ignore errors if already disconnected
        console.warn(`⚠️ [TWS Client] Error during disconnect:`, e);
      } finally {
        this.connected = false;
        this.connecting = false;
        if (this.connectPromise) {
          this.connectPromise = null;
        }
        this.ib = null; // Ensure IB instance is cleared
      }
    } else if (!this.ib) {
      // Already disconnected - just clear flags
      this.connected = false;
      this.connecting = false;
      if (this.connectPromise) {
        this.connectPromise = null;
      }
    }
  }

  /**
   * Start keep-alive mechanism to prevent inactivity disconnects
   * Requests account updates every 20 seconds to keep connection alive
   * This is a lightweight request that doesn't require subscriptions
   */
  private startKeepAlive(): void {
    // Clear existing interval if any
    this.stopKeepAlive();

    // Send keep-alive every 20 seconds (IB Gateway typically disconnects after 30s of inactivity)
    this.keepAliveInterval = setInterval(() => {
      if (this.ib && this.connected) {
        try {
          // reqAccountUpdates() is a lightweight keep-alive request
          // We already subscribe to account updates, so this just refreshes the subscription
          // This keeps the connection active without creating new subscriptions
          this.ib.reqAccountUpdates(true, ""); // true = subscribe, "" = all accounts
          this.lastActivityTime = Date.now();
          // Don't log every keep-alive to reduce noise - only log occasionally
          if (Math.random() < 0.1) {
            // Log ~10% of keep-alives
            const secondsSinceLastActivity = Math.round(
              (Date.now() - this.lastActivityTime) / 1000
            );
            console.log(
              `💓 [TWS Client] Keep-alive sent (last activity: ${secondsSinceLastActivity}s ago)`
            );
          }
        } catch (e) {
          console.warn(`⚠️ [TWS Client] Keep-alive failed:`, e);
          // If keep-alive fails, connection might be broken - mark as disconnected
          if (this.ib) {
            this.connected = false;
          }
        }
      } else {
        // Not connected - stop keep-alive
        this.stopKeepAlive();
      }
    }, 20000); // Every 20 seconds

    console.log(`💓 [TWS Client] Keep-alive started (every 20 seconds)`);
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log(`💓 [TWS Client] Keep-alive stopped`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClientId(): number {
    return this.config.clientId;
  }

  getConfig(): Required<TwsConfig> {
    return { ...this.config };
  }

  /**
   * Get detected account type (PAPER, LIVE, or UNKNOWN)
   * Similar to Python code's self.account_type
   */
  getAccountType(): "PAPER" | "LIVE" | "UNKNOWN" {
    return this.accountType || "UNKNOWN";
  }

  /**
   * Get next valid order ID
   */
  getNextValidOrderId(): number | null {
    return this.nextValidOrderId;
  }

  /**
   * Get real-time market data via streaming (not snapshot)
   * Subscribes to streaming data, collects enough data, then cancels subscription
   * Returns data with Last Price, Close, and Volume
   *
   * DEPRECATED (Phase 6): This method is deprecated for direct use by consumers.
   * Use MarketDataHub.getLastMarketTick() or MarketDataHub.getBars() instead.
   * This method is only used internally by the streaming layer.
   */
  async getMarketDataSnapshot(symbol: string): Promise<IbkrMarketDataSnapshot> {
    await this.connect();

    // Update last activity time when making requests
    this.lastActivityTime = Date.now();

    const lib = this.ensureIBLib();
    const reqId = Math.floor(Math.random() * 10000) + 1000;

    const contract = {
      symbol: symbol.toUpperCase(),
      secType: lib.SecType.STK,
      exchange: "SMART",
      currency: "USD",
    };

    return new Promise((resolve, reject) => {
      const data: IbkrMarketDataSnapshot = { conid: reqId };
      const fieldsReceived = new Set<number>();
      let tickPriceReceived = false;
      let tickSizeReceived = false;
      let hasEnoughData = false;
      let snapshotTimeout: NodeJS.Timeout | null = null;
      let longTimeout: NodeJS.Timeout | null = null;

      let cleanup: (() => void) | null = null;

      const checkComplete = () => {
        // Check if we have at least Last Price, Close, and Volume
        const hasLastPrice = data["31"] && parseFloat(data["31"]) > 0;
        const hasClose = data["7295"] && parseFloat(data["7295"]) > 0;
        const hasVolume = data["7308"] && parseFloat(data["7308"]) >= 0; // Volume can be 0

        if (hasLastPrice && hasClose && hasVolume) {
          if (!hasEnoughData) {
            hasEnoughData = true;
            console.log(
              `✅ [TWS] ${symbol}: Received complete data - Last: ${data["31"]}, Close: ${data["7295"]}, Volume: ${data["7308"]}`
            );

            // Cancel subscription since we have enough data
            if (this.ib) {
              try {
                this.ib.cancelMktData(reqId);
                console.log(`🛑 [TWS] ${symbol}: Cancelled subscription after receiving data`);
              } catch (e) {
                console.warn(`⚠️ [TWS] ${symbol}: Error cancelling subscription:`, e);
              }
            }

            if (snapshotTimeout) clearTimeout(snapshotTimeout);
            if (longTimeout) clearTimeout(longTimeout);
            if (cleanup) cleanup();
            resolve(data);
          }
        } else {
          // Log progress for debugging
          const received = [];
          if (hasLastPrice) received.push("Last Price");
          if (hasClose) received.push("Close");
          if (hasVolume) received.push("Volume");
          if (received.length > 0 && received.length < 3) {
            console.log(`⏳ [TWS] ${symbol}: Received partial data - ${received.join(", ")}`);
          }
        }
      };

      const onTickPrice = (id: number, field: number, price: number) => {
        if (id === reqId) {
          fieldsReceived.add(field);
          tickPriceReceived = true;

          // Only process valid prices
          if (!price || price <= 0 || !isFinite(price)) {
            return; // Ignore invalid prices
          }

          switch (field) {
            case 1:
              data["84"] = price.toString(); // Bid
              break;
            case 2:
              data["86"] = price.toString(); // Ask
              break;
            case 4:
              data["31"] = price.toString(); // Last Price
              console.log(`💰 [TWS] ${symbol}: Last Price = $${price.toFixed(2)}`);
              break;
            case 6:
              data["87"] = price.toString(); // High
              break;
            case 7:
              data["88"] = price.toString(); // Low
              break;
            case 9:
              data["7295"] = price.toString(); // Close (previous close)
              console.log(`📊 [TWS] ${symbol}: Close = $${price.toFixed(2)}`);
              break;
          }

          checkComplete();
        }
      };

      const onTickSize = (id: number, field: number, size: number) => {
        if (id === reqId) {
          fieldsReceived.add(field);
          tickSizeReceived = true;

          if (field === 8) {
            // Volume - can be 0 for new symbols or after-hours
            if (size >= 0 && isFinite(size)) {
              data["7308"] = size.toString();
              console.log(`📈 [TWS] ${symbol}: Volume = ${size.toLocaleString()}`);
            }
          }

          checkComplete();
        }
      };

      const onTickString = (id: number, field: number, value: string) => {
        if (id === reqId) {
          data[field.toString()] = value;
        }
      };

      const onTickGeneric = (id: number, field: number, value: number) => {
        if (id === reqId) {
          data[field.toString()] = value.toString();
        }
      };

      // Define cleanup function (after all handlers are defined)
      // CRITICAL: Check if this.ib exists before removing listeners
      cleanup = () => {
        if (!this.ib) {
          console.warn(`⚠️ [TWS] ${symbol}: Cleanup called but this.ib is already null`);
          return;
        }
        try {
          this.ib.removeListener(lib.EventName.tickPrice, onTickPrice);
          this.ib.removeListener(lib.EventName.tickSize, onTickSize);
          this.ib.removeListener(lib.EventName.tickString, onTickString);
          this.ib.removeListener(lib.EventName.tickGeneric, onTickGeneric);
        } catch (e) {
          // Ignore errors if already removed or disconnected
          console.warn(`⚠️ [TWS] ${symbol}: Error during cleanup:`, e);
        }
      };

      // Listen to events
      this.ib.on(lib.EventName.tickPrice, onTickPrice);
      this.ib.on(lib.EventName.tickSize, onTickSize);
      this.ib.on(lib.EventName.tickString, onTickString);
      this.ib.on(lib.EventName.tickGeneric, onTickGeneric);

      // Request market data in STREAMING mode (false = streaming, true = snapshot)
      // Streaming mode: continuously receives updates until cancelled
      // We'll cancel after receiving enough data
      this.ib.reqMktData(reqId, contract, "", false, false);

      // Track if we received error 10089 (delayed data available)
      let delayedDataAvailable = false;
      let securityNotFound = false;
      let errorReceived = false;

      // Handle errors from IB Gateway
      const errorHandlerForSnapshot = (err: Error, code: number, id: number) => {
        if (id === reqId) {
          errorReceived = true;

          // Error 10089: Market data subscription required, but delayed data is available
          if (code === 10089 || err.message?.includes("additional subscription")) {
            console.log(
              `⚠️ [TWS] ${symbol}: Real-time data requires subscription, delayed data available (code: 10089)`
            );
            delayedDataAvailable = true;
            // Don't reject - wait for delayed data to arrive
            return;
          }

          // Error 200: No security definition found (symbol doesn't exist)
          if (code === 200 || err.message?.includes("No security definition")) {
            console.error(`❌ [TWS] ${symbol}: Security not found (code: 200)`);
            securityNotFound = true;
            if (cleanup) cleanup();
            if (snapshotTimeout) clearTimeout(snapshotTimeout);
            if (longTimeout) clearTimeout(longTimeout);
            reject(new Error(`Security ${symbol} not found in IBKR`));
            return;
          }
        }
      };

      // Listen to error events
      this.ib.on(lib.EventName.error, errorHandlerForSnapshot);

      // Update cleanup to remove error handler
      const originalCleanup = cleanup;
      cleanup = () => {
        if (originalCleanup) originalCleanup();
        if (this.ib) {
          try {
            this.ib.removeListener(lib.EventName.error, errorHandlerForSnapshot);
          } catch (e) {
            // Ignore errors if already removed or disconnected
            console.warn(`⚠️ [TWS] ${symbol}: Error removing error handler:`, e);
          }
        }
      };

      // In snapshot mode, data comes once and subscription auto-cancels
      // But we still need timeouts as safety nets
      // Increased timeout for delayed data (can take 10-15 seconds)
      snapshotTimeout = setTimeout(() => {
        if (securityNotFound) return; // Already handled

        if (delayedDataAvailable || tickPriceReceived || tickSizeReceived) {
          // If we have delayed data available or some data received, wait a bit longer
          console.log(
            `⏳ [TWS] ${symbol}: Waiting for delayed data (has: ${tickPriceReceived || tickSizeReceived ? "yes" : "no"})...`
          );
          return; // Don't resolve yet, wait for longTimeout
        }

        if (!errorReceived) {
          // No error received yet, might still be connecting
          console.log(`⏳ [TWS] ${symbol}: No data yet, waiting longer...`);
          return;
        }

        // Only reject if we got an error and no data
        // Cancel subscription if still active
        if (this.ib) {
          try {
            this.ib.cancelMktData(reqId);
          } catch (e) {
            // Ignore errors
          }
        }
        if (cleanup) cleanup();
        if (longTimeout) clearTimeout(longTimeout);
        reject(new Error(`Streaming timeout for ${symbol} - no data received`));
      }, 10000); // Increased to 10 seconds for delayed data

      // Long timeout as absolute fallback (20 seconds for delayed data)
      longTimeout = setTimeout(() => {
        if (securityNotFound) return; // Already handled

        // Cancel subscription if still active
        if (this.ib) {
          try {
            this.ib.cancelMktData(reqId);
            console.log(`🛑 [TWS] ${symbol}: Cancelled subscription after timeout`);
          } catch (e) {
            // Ignore errors
          }
        }

        if (cleanup) cleanup();
        if (snapshotTimeout) clearTimeout(snapshotTimeout);

        // If we have some data (even if incomplete), return it
        if (tickPriceReceived || tickSizeReceived || delayedDataAvailable) {
          const hasLastPrice = data["31"] && parseFloat(data["31"]) > 0;
          const hasClose = data["7295"] && parseFloat(data["7295"]) > 0;
          const hasVolume = data["7308"] !== undefined;

          console.log(
            `⚠️ [TWS] ${symbol}: Returning ${hasLastPrice && hasClose && hasVolume ? "complete" : "partial"}/delayed data after timeout`
          );
          console.log(
            `📊 [TWS] ${symbol}: Data received - Last: ${data["31"] || "N/A"}, Close: ${data["7295"] || "N/A"}, Volume: ${data["7308"] || "N/A"}`
          );
          resolve(data);
        } else {
          reject(new Error(`Streaming timeout for ${symbol} - no data received after 20 seconds`));
        }
      }, 20000); // 20 seconds for delayed data
    });
  }

  async getHistoricalData(
    symbol: string,
    duration: string = "1 Y",
    barSize: string = "1 day"
  ): Promise<IbkrHistoricalBar[]> {
    await this.connect();

    const lib = this.ensureIBLib();
    const reqId = Math.floor(Math.random() * 10000) + 1000;

    const contract = {
      symbol: symbol.toUpperCase(),
      secType: lib.SecType.STK,
      exchange: "SMART",
      currency: "USD",
    };

    // Map bar size strings
    let barSizeSetting = lib.BarSizeSetting.ONE_DAY;
    switch (barSize) {
      case "1 min":
        barSizeSetting = lib.BarSizeSetting.MINUTES_ONE;
        break;
      case "5 mins":
        barSizeSetting = lib.BarSizeSetting.MINUTES_FIVE;
        break;
      case "1 hour":
        barSizeSetting = lib.BarSizeSetting.HOURS_ONE;
        break;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout getting historical data for ${symbol}`));
      }, 15000);

      const bars: IbkrHistoricalBar[] = [];

      this.ib.on(
        lib.EventName.historicalData,
        (
          id: number,
          date: string,
          open: number,
          high: number,
          low: number,
          close: number,
          volume: number
        ) => {
          if (id === reqId) {
            bars.push({
              t: new Date(date).getTime(),
              o: open,
              h: high,
              l: low,
              c: close,
              v: volume,
            });
          }
        }
      );

      this.ib.once(lib.EventName.historicalDataEnd, (id: number) => {
        if (id === reqId) {
          clearTimeout(timeout);
          resolve(bars);
        }
      });

      this.ib.reqHistoricalData(
        reqId,
        contract,
        "",
        duration,
        barSizeSetting,
        lib.WhatToShow.TRADES,
        1,
        1,
        false,
        []
      );
    });
  }

  async getAccounts(): Promise<string[]> {
    await this.connect();

    const lib = this.ensureIBLib();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout getting accounts - IB Gateway might not be fully initialized"));
      }, 15000); // Increased to 15 seconds

      this.ib.once(lib.EventName.managedAccounts, (accountsList: string) => {
        clearTimeout(timeout);
        const accounts = accountsList.split(",").filter((a: string) => a.trim());
        resolve(accounts);
      });

      this.ib.reqManagedAccts();
    });
  }

  /**
   * Subscribe to real-time market data streaming
   */
  async subscribeMarketData(
    symbol: string,
    reqId: number,
    callback: (data: IbkrMarketDataSnapshot) => void
  ): Promise<void> {
    await this.connect();

    const lib = this.ensureIBLib();

    const contract = {
      symbol: symbol.toUpperCase(),
      secType: lib.SecType.STK,
      exchange: "SMART",
      currency: "USD",
    };

    const data: IbkrMarketDataSnapshot = { conid: reqId };

    // Listen to price updates
    const onTickPrice = (id: number, field: number, price: number) => {
      if (id === reqId) {
        data[field] = String(price);
        callback({ ...data });
      }
    };

    const onTickSize = (id: number, field: number, size: number) => {
      if (id === reqId) {
        data[field] = String(size);
        callback({ ...data });
      }
    };

    // Register listeners
    this.ib.on(lib.EventName.tickPrice, onTickPrice);
    this.ib.on(lib.EventName.tickSize, onTickSize);

    // Request market data (streaming mode)
    this.ib.reqMktData(reqId, contract, "", false, false);

    console.log(`📡 [TWS Client] Started streaming for ${symbol} (reqId: ${reqId})`);
  }

  /**
   * Cancel market data subscription
   */
  cancelMarketData(reqId: number): void {
    if (this.ib && this.isConnected) {
      this.ib.cancelMktData(reqId);
      console.log(`🛑 [TWS Client] Cancelled streaming (reqId: ${reqId})`);
    }
  }
}

let clientInstance: TwsClient | null = null;
const DEFAULT_PORT = 4001; // Paper Trading - most common
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_CLIENT_ID = 1; // Use a fixed Client ID for singleton to prevent conflicts

export function getTwsClient(config?: TwsConfig): TwsClient {
  // Normalize config - use defaults if not provided, and always use same Client ID for singleton
  const normalizedConfig: TwsConfig = {
    host: config?.host || DEFAULT_HOST,
    port: config?.port || DEFAULT_PORT,
    clientId: DEFAULT_CLIENT_ID, // Always use same Client ID to prevent conflicts
  };

  if (!clientInstance) {
    // First time - create new instance
    clientInstance = new TwsClient(normalizedConfig);
    console.log(`🆕 [TWS Client Singleton] Created new instance`);
    console.log(`   📍 Host: ${normalizedConfig.host}, Port: ${normalizedConfig.port}`);
    console.log(`   🆔 Client ID: ${clientInstance.getClientId()} (fixed for singleton)`);
  } else {
    // Instance exists - check if we should reuse it
    // Only replace if we have different config (different port/host)
    const existingConfig = clientInstance.getConfig();
    const shouldReplace =
      normalizedConfig.port !== existingConfig.port ||
      normalizedConfig.host !== existingConfig.host;

    if (shouldReplace) {
      console.log(`🔄 [TWS Client Singleton] Replacing instance due to config change`);
      console.log(`   Old: ${existingConfig.host}:${existingConfig.port}`);
      console.log(`   New: ${normalizedConfig.host}:${normalizedConfig.port}`);
      try {
        clientInstance.disconnect();
      } catch (e) {
        // Ignore errors
      }
      clientInstance = new TwsClient(normalizedConfig);
      console.log(`🆕 [TWS Client Singleton] Created new instance`);
      console.log(`   🆔 Client ID: ${clientInstance.getClientId()}`);
    } else {
      // Reuse existing instance
      console.log(
        `♻️  [TWS Client Singleton] Reusing existing instance (${existingConfig.host}:${existingConfig.port})`
      );
      console.log(
        `   🆔 Client ID: ${clientInstance.getClientId()}, Connected: ${clientInstance.isConnected()}`
      );
    }
  }

  return clientInstance;
}
