/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountStatusData {
  balance: number | null;
  totalPnL: number | null;
  pnlPercent: number | null;
}

interface AccountStatusState extends AccountStatusData {
  loading: boolean;
  error: string | null;
}

function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "$0.00";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "0%";
  return `${value.toFixed(2)}%`;
}

export function AccountStatusPanel() {
  const [state, setState] = useState<AccountStatusState>({
    balance: null,
    totalPnL: null,
    pnlPercent: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/ibkr/account/summary", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body?.error || `שגיאה בטעינת סטטוס החשבון (קוד ${response.status})`;

          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: message,
            }));
          }
          return;
        }

        const data = (await response.json()) as {
          netLiquidation: number | null;
          totalCashValue: number | null;
          totalPnL: number | null;
          pnlPercent: number | null;
        };

        const balance = data.netLiquidation ?? data.totalCashValue ?? 0;

        if (!cancelled) {
          setState({
            balance,
            totalPnL: data.totalPnL ?? 0,
            pnlPercent: data.pnlPercent ?? 0,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error("[AccountStatusPanel] Failed to load account status:", error);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "שגיאה בחיבור לשרת החשבון",
          }));
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const { balance, totalPnL, pnlPercent, loading, error } = state;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>סטטוס חשבון</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">יתרה</span>
            <span className="font-semibold">
              {loading ? "טוען..." : formatCurrency(balance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">רווח/הפסד</span>
            <span className="font-semibold">
              {loading ? "טוען..." : formatCurrency(totalPnL)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">אחוזי רווח</span>
            <span className="font-semibold">
              {loading ? "טוען..." : formatPercent(pnlPercent)}
            </span>
          </div>
          {error && !loading && (
            <div className="text-xs text-destructive mt-2 text-right" role="alert">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
