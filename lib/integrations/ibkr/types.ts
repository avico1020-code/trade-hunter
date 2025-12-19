/**
 * IBKR Gateway Streaming Integration - Type Definitions
 */

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export interface ConnectionConfig {
  host: string;
  port: number; // 4001 (Paper) or 4002 (Live)
  clientId: number;
}

export interface ConnectionStatus {
  state: ConnectionState;
  port: number; // 4001 or 4002
  clientId: number;
  accountType: "PAPER" | "LIVE" | "UNKNOWN";
  lastConnectTime: number | null;
  lastDisconnectTime: number | null;
  lastError: string | null;
}

/**
 * Enhanced connection status for Phase 7 health monitoring
 */
export interface IbkrConnectionStatus {
  isConnected: boolean;
  lastConnectAttemptTs: number | null;
  lastSuccessfulConnectTs: number | null;
  lastDisconnectTs: number | null;
  lastIbkrError: { code: number; message: string; ts: number } | null;
}
