"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IbkrAccount, IbkrAuthStatus, IbkrMarketDataSnapshot } from "@/lib/types/ibkr";

/**
 * Hook to check IBKR authentication status
 */
export function useIbkrAuthStatus() {
  const [status, setStatus] = useState<IbkrAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/ibkr/auth/status");

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { status, isLoading, error, refetch: checkStatus };
}

/**
 * Hook to fetch IBKR portfolio accounts
 */
export function useIbkrAccounts() {
  const [accounts, setAccounts] = useState<IbkrAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/ibkr/portfolio/accounts");

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, isLoading, error, refetch: fetchAccounts };
}

/**
 * Hook to fetch market data snapshot for a stock
 */
export function useIbkrMarketData(symbol?: string) {
  const [data, setData] = useState<IbkrMarketDataSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async (sym: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/ibkr/market-data/snapshot?symbol=${sym}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbol) {
      fetchMarketData(symbol);
    }
  }, [symbol, fetchMarketData]);

  return { data, isLoading, error, refetch: () => symbol && fetchMarketData(symbol) };
}

/**
 * Hook for real-time market data streaming via WebSocket
 */
export function useIbkrStreamMarketData(conids: number[], fields?: string[]) {
  const [data, setData] = useState<Map<number, IbkrMarketDataSnapshot>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (conids.length === 0) return;

    const conidsParam = conids.join(",");
    const fieldsParam = fields?.join(",") || "31,84,86"; // Default: Last, Bid, Ask

    const wsUrl = `ws://localhost:3000/api/ibkr/stream?conids=${conidsParam}&fields=${fieldsParam}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("IBKR WebSocket connected");
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Update data map with new snapshot
          if (message.conid) {
            setData((prev) => {
              const newMap = new Map(prev);
              newMap.set(message.conid, message);
              return newMap;
            });
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("IBKR WebSocket error:", event);
        setError("WebSocket connection error");
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("IBKR WebSocket disconnected");
        setIsConnected(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create WebSocket");
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conids, fields]);

  return { data, isConnected, error };
}
