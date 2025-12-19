"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConnectionStatus {
  authenticated: boolean;
  connected: boolean;
  message: string;
}

interface Account {
  id: string;
  accountId: string;
  displayName: string;
}

interface MarketData {
  "31"?: string; // Last Price
  "84"?: string; // Bid
  "86"?: string; // Ask
  "87"?: string; // High
  "88"?: string; // Low
  "7308"?: string; // Volume
}

export function IbkrConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/ibkr/auth/status");
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    setAccountsError(null);
    try {
      const res = await fetch("/api/ibkr/portfolio/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err: any) {
      setAccountsError(err.message);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchMarketData = async () => {
    setIsLoadingMarket(true);
    setMarketError(null);
    try {
      const res = await fetch("/api/ibkr/market-data/snapshot?symbol=AAPL");
      const data = await res.json();
      setMarketData(data);
    } catch (err: any) {
      setMarketError(err.message);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (status?.connected && status?.authenticated) {
      fetchAccounts();
      fetchMarketData();
    }
  }, [status]);

  const isConnected = status?.connected && status?.authenticated;

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>IB Gateway Connection Status</span>
          <Button onClick={fetchStatus} disabled={isLoadingAuth} size="sm">
            {isLoadingAuth ? "Refreshing..." : "Refresh Status"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Connection</h3>
          {isLoadingAuth ? (
            <p>Checking connection status...</p>
          ) : authError ? (
            <p className="text-red-500">Error: {authError}</p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span>Connected:</span>
                <Badge variant={status?.connected ? "default" : "destructive"}>
                  {status?.connected ? "Yes" : "No"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{status?.message || "N/A"}</p>
              {!isConnected && (
                <p className="text-orange-500 text-sm mt-2">
                  Please ensure IB Gateway is running, fully connected, and accessible at https://localhost:5000
                </p>
              )}
            </div>
          )}
        </div>

        {isConnected && (
          <>
            <div>
              <h3 className="text-lg font-semibold flex items-center justify-between">
                <span>Accounts</span>
                <Button onClick={fetchAccounts} disabled={isLoadingAccounts} size="sm">
                  {isLoadingAccounts ? "Refreshing..." : "Refresh"}
                </Button>
              </h3>
              {isLoadingAccounts ? (
                <p>Loading accounts...</p>
              ) : accountsError ? (
                <p className="text-red-500">Error: {accountsError}</p>
              ) : accounts && accounts.length > 0 ? (
                <ul className="list-disc pl-5">
                  {accounts.map((account) => (
                    <li key={account.id}>{account.displayName}</li>
                  ))}
                </ul>
              ) : (
                <p>No accounts found.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold flex items-center justify-between">
                <span>Sample Market Data (AAPL)</span>
                <Button onClick={fetchMarketData} disabled={isLoadingMarket} size="sm">
                  {isLoadingMarket ? "Loading..." : "Refresh"}
                </Button>
              </h3>
              {isLoadingMarket ? (
                <p>Loading AAPL market data...</p>
              ) : marketError ? (
                <p className="text-red-500">Error: {marketError}</p>
              ) : marketData ? (
                <div className="space-y-1">
                  <p>Last Price: ${marketData["31"] || "N/A"}</p>
                  <p>Bid: ${marketData["84"] || "N/A"}</p>
                  <p>Ask: ${marketData["86"] || "N/A"}</p>
                  <p>High: ${marketData["87"] || "N/A"}</p>
                  <p>Low: ${marketData["88"] || "N/A"}</p>
                  <p>Volume: {marketData["7308"] || "N/A"}</p>
                </div>
              ) : (
                <p>No market data available.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
