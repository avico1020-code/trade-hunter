// Interactive Brokers TWS Socket API Client
// Connects to TWS/IB Gateway via Socket on port 4002 (Paper) or 7496 (Live)

import { type Contract, EventName, IBApi, SecType } from "@stoqey/ib";

// Configuration from environment or defaults
const IB_HOST = process.env.IB_HOST || "127.0.0.1";
const IB_PORT = parseInt(process.env.IB_PORT || "4002"); // 4002 = Paper Trading
const CLIENT_ID = parseInt(process.env.IB_CLIENT_ID || "1");

// Global IB API instance (singleton)
let ibApiInstance: IBApi | null = null;
let isConnecting = false;
let isConnected = false;

/**
 * Get or create IB API instance
 */
export function getIBApi(): IBApi {
  if (!ibApiInstance) {
    ibApiInstance = new IBApi({
      host: IB_HOST,
      port: IB_PORT,
      clientId: CLIENT_ID,
    });

    // Setup event listeners
    setupEventListeners(ibApiInstance);
  }

  return ibApiInstance;
}

/**
 * Setup event listeners for IB API
 */
function setupEventListeners(api: IBApi) {
  api.on(EventName.connected, () => {
    console.log("✅ Connected to TWS/IB Gateway");
    isConnected = true;
    isConnecting = false;
  });

  api.on(EventName.disconnected, () => {
    console.log("❌ Disconnected from TWS/IB Gateway");
    isConnected = false;
    isConnecting = false;
  });

  api.on(EventName.error, (err: Error, code: number, reqId: number) => {
    console.error(`IB API Error [${code}] (reqId: ${reqId}):`, err.message);

    // Handle connection errors
    if (code === 502 || code === 504) {
      isConnected = false;
      isConnecting = false;
    }
  });

  api.on(EventName.info, (message: string, code: number) => {
    console.log(`IB API Info [${code}]:`, message);
  });
}

/**
 * Connect to TWS/IB Gateway if not already connected
 */
export async function connectToIB(): Promise<void> {
  const api = getIBApi();

  if (isConnected) {
    return; // Already connected
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
    });
    return;
  }

  isConnecting = true;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      isConnecting = false;
      reject(new Error("Connection timeout. Make sure TWS/IB Gateway is running."));
    }, 10000); // 10 second timeout

    api.once(EventName.connected, () => {
      clearTimeout(timeout);
      resolve();
    });

    api.once(EventName.error, (err: Error, code: number) => {
      if (code === 502 || code === 504) {
        clearTimeout(timeout);
        isConnecting = false;
        reject(
          new Error(
            "Cannot connect to TWS. Make sure it's running and API is enabled (port 4002 for Paper Trading)."
          )
        );
      }
    });

    try {
      api.connect();
    } catch (error) {
      clearTimeout(timeout);
      isConnecting = false;
      reject(error);
    }
  });
}

/**
 * Disconnect from TWS/IB Gateway
 */
export function disconnectFromIB(): void {
  if (ibApiInstance && isConnected) {
    ibApiInstance.disconnect();
    isConnected = false;
  }
}

/**
 * Check if connected to IB
 */
export function isIBConnected(): boolean {
  return isConnected;
}

/**
 * Create a stock contract for a given symbol
 */
export function createStockContract(symbol: string, exchange: string = "SMART"): Contract {
  return {
    symbol: symbol.toUpperCase(),
    secType: SecType.STK,
    currency: "USD",
    exchange: exchange,
  };
}

/**
 * Get Contract ID (conid) for a stock symbol
 * This searches for the contract and returns its ID
 */
export async function getContractId(symbol: string): Promise<number> {
  await connectToIB();
  const api = getIBApi();

  return new Promise((resolve, reject) => {
    const contract = createStockContract(symbol);
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout getting contract ID for ${symbol}`));
    }, 5000);

    api
      .getContractDetails(contract)
      .then((details) => {
        clearTimeout(timeout);
        if (details && details.length > 0) {
          resolve(details[0].contract.conId!);
        } else {
          reject(new Error(`No contract found for symbol: ${symbol}`));
        }
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Get real-time market data for a stock symbol
 */
export async function getMarketData(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  close: number;
}> {
  await connectToIB();
  const api = getIBApi();
  const contract = createStockContract(symbol);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout getting market data for ${symbol}`));
    }, 10000);

    const marketData: any = {
      symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      bid: 0,
      ask: 0,
      high: 0,
      low: 0,
      open: 0,
      close: 0,
    };

    let dataReceived = false;

    // Request market data
    const reqId = Math.floor(Math.random() * 10000);

    // Listen for ticker updates
    const tickerHandler = (tickerId: number, field: number, value: number | string) => {
      if (tickerId !== reqId) return;

      dataReceived = true;

      // Map field IDs to data
      switch (field) {
        case 1: // Bid
          marketData.bid = Number(value);
          break;
        case 2: // Ask
          marketData.ask = Number(value);
          break;
        case 4: // Last Price
          marketData.price = Number(value);
          break;
        case 6: // High
          marketData.high = Number(value);
          break;
        case 7: // Low
          marketData.low = Number(value);
          break;
        case 8: // Volume
          marketData.volume = Number(value);
          break;
        case 9: // Close
          marketData.close = Number(value);
          break;
        case 14: // Open
          marketData.open = Number(value);
          break;
      }
    };

    api.on(EventName.tickPrice, tickerHandler);
    api.on(EventName.tickSize, tickerHandler);

    // After a short delay, calculate change and resolve
    setTimeout(() => {
      if (dataReceived) {
        clearTimeout(timeout);

        // Calculate change and percentage
        if (marketData.close > 0 && marketData.price > 0) {
          marketData.change = marketData.price - marketData.close;
          marketData.changePercent = (marketData.change / marketData.close) * 100;
        }

        // Cancel market data subscription
        api.cancelMktData(reqId);

        // Remove listeners
        api.removeListener(EventName.tickPrice, tickerHandler);
        api.removeListener(EventName.tickSize, tickerHandler);

        resolve(marketData);
      } else {
        clearTimeout(timeout);
        api.cancelMktData(reqId);
        api.removeListener(EventName.tickPrice, tickerHandler);
        api.removeListener(EventName.tickSize, tickerHandler);
        reject(new Error(`No market data received for ${symbol}`));
      }
    }, 3000); // Wait 3 seconds for data

    // Request market data
    api.reqMktData(reqId, contract, "", false, false);
  });
}

/**
 * Get historical data for a stock symbol
 * Returns array of closing prices for chart
 */
export async function getHistoricalData(
  symbol: string,
  duration: string = "1 M",
  barSize: string = "1 day"
): Promise<number[]> {
  await connectToIB();
  const api = getIBApi();
  const contract = createStockContract(symbol);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout getting historical data for ${symbol}`));
    }, 10000);

    const reqId = Math.floor(Math.random() * 10000);
    const bars: number[] = [];

    const historicalDataHandler = (
      tickerId: number,
      time: string,
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number
    ) => {
      if (tickerId === reqId) {
        bars.push(close);
      }
    };

    const historicalDataEndHandler = (tickerId: number) => {
      if (tickerId === reqId) {
        clearTimeout(timeout);
        api.removeListener(EventName.historicalData, historicalDataHandler);
        api.removeListener(EventName.historicalDataEnd, historicalDataEndHandler);
        resolve(bars);
      }
    };

    api.on(EventName.historicalData, historicalDataHandler);
    api.on(EventName.historicalDataEnd, historicalDataEndHandler);

    // Request historical data
    const endDateTime = ""; // Empty = now
    api.reqHistoricalData(
      reqId,
      contract,
      endDateTime,
      duration,
      barSize,
      "TRADES",
      1, // Use RTH (Regular Trading Hours)
      1, // Format date as string
      false,
      []
    );
  });
}

/**
 * Get multiple market data quotes in parallel
 */
export async function getMultipleMarketData(symbols: string[]): Promise<
  Array<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>
> {
  const promises = symbols.map(async (symbol) => {
    try {
      const data = await getMarketData(symbol);
      return {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
      };
    }
  });

  return Promise.all(promises);
}
