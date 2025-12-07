"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeMarketData } from "@/lib/hooks/useRealtimeMarketData";

interface Stock {
  id: Id<"listStocks">;
  symbol: string;
  price: number;
  volume: number;
  changePercent: number;
}

interface StocksTableProps {
  onSelectStock: (stock: Stock) => void;
  selectedStockSymbol?: string;
  availableStrategies: string[];
  onAddStrategy: (strategy: string) => void;
}

export function StocksTable({
  onSelectStock,
  selectedStockSymbol,
  availableStrategies,
  onAddStrategy,
}: StocksTableProps) {
  const { toast } = useToast();
  const listStocks = useQuery(api.stocksLists.getListStocks);
  const addStock = useMutation(api.stocksLists.addStock);
  const removeStock = useMutation(api.stocksLists.removeStock);

  const [isAdding, setIsAdding] = useState(false);
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);

  // Map Convex data to UI format with real-time IBKR data
  const stocks: Stock[] =
    listStocks?.map((stock) => ({
      id: stock.id,
      symbol: stock.symbol,
      // Will be populated by StockRow component with real-time data
      price: 0,
      volume: 0,
      changePercent: 0,
    })) ?? [];

  const handleDelete = async (id: Id<"listStocks">) => {
    try {
      await removeStock({ stockId: id });
      toast({
        title: "המניה נמחקה",
        description: "המניה הוסרה מהרשימה בהצלחה",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "אירעה שגיאה במחיקת המניה",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleAddStock = async () => {
    if (!newStockSymbol.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין סימבול מניה",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setIsAddingStock(true);
      await addStock({ symbol: newStockSymbol.trim() });
      toast({
        title: "המניה נוספה ✅",
        description: `${newStockSymbol.toUpperCase()} נוספה לרשימה בהצלחה`,
        duration: 3000,
      });
      setNewStockSymbol("");
    setIsAdding(false);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "אירעה שגיאה בהוספת המניה",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsAddingStock(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={isStrategyDialogOpen} onOpenChange={setIsStrategyDialogOpen}>
          <DialogTrigger asChild={true}>
            <Button variant="default" size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              הוסף אסטרטגיה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">בחר אסטרטגיה</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              {availableStrategies.map((strategy) => (
                <Button
                  key={strategy}
                  variant="outline"
                  className="justify-between"
                  onClick={() => {
                    onAddStrategy(strategy);
                    setIsStrategyDialogOpen(false);
                  }}
                >
                  {strategy}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="secondary" size="sm">
          סקירה כללית
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3 font-semibold whitespace-nowrap">סימבול</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">מחיר</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">ווליום</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">אחוז שינוי</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <StockRow
                    key={stock.id}
                    stock={stock}
                    selected={selectedStockSymbol === stock.symbol}
                    onSelect={onSelectStock}
                    onDelete={handleDelete}
                  />
                ))}
                {isAdding && (
                  <tr className="border-b">
                    <td colSpan={5} className="p-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="הזן סימבול מניה (למשל: AAPL)"
                          value={newStockSymbol}
                          onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddStock();
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-[#404040] bg-[#2a2a2a] rounded-lg text-sm text-[#f5f5f5] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35]"
                          disabled={isAddingStock}
                          suppressHydrationWarning={true}
                        />
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleAddStock}
                          disabled={isAddingStock}
                        >
                          {isAddingStock ? "מוסיף..." : "הוסף"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAdding(false);
                            setNewStockSymbol("");
                          }}
                          disabled={isAddingStock}
                        >
                          ביטול
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="orangeOutline"
        className="w-full flex items-center gap-2"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-4 w-4" />
        הוסף מניה למעקב
      </Button>
    </div>
  );
}

// Component for individual stock row with real-time IBKR data
interface StockRowProps {
  stock: Stock;
  selected: boolean;
  onSelect: (stock: Stock) => void;
  onDelete: (id: Id<"listStocks">) => void;
}

function StockRow({ stock, selected, onSelect, onDelete }: StockRowProps) {
  // Get real-time market data from IBKR (with Yahoo Finance fallback)
  const { price, volume, changePercent, source, isLoading } = useRealtimeMarketData(stock.symbol);

  // Update stock data with real-time values
  const stockWithData: Stock = {
    ...stock,
    price: price > 0 ? price : stock.price,
    volume: volume > 0 ? volume : stock.volume,
    changePercent: price > 0 ? changePercent : stock.changePercent,
  };

  return (
    <tr
      className={`border-b cursor-pointer hover:bg-muted/50 ${selected ? "bg-muted" : ""}`}
      onClick={() => onSelect(stockWithData)}
    >
      <td className="p-3 font-medium whitespace-nowrap">
        {stock.symbol}
        {source && (
          <span
            className={`text-xs ml-2 ${
              source === "ibkr" ? "text-green-500" : "text-blue-500"
            }`}
            title={source === "ibkr" ? "IBKR Real-time" : "Yahoo Finance"}
          >
            {source === "ibkr" ? "📡" : "📰"}
          </span>
        )}
      </td>
      <td className="p-3 whitespace-nowrap">
        {isLoading ? (
          <span className="text-muted-foreground">...</span>
        ) : stockWithData.price > 0 ? (
          `$${stockWithData.price.toFixed(2)}`
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="p-3 whitespace-nowrap">
        {isLoading ? (
          <span className="text-muted-foreground">...</span>
        ) : stockWithData.volume > 0 ? (
          stockWithData.volume.toLocaleString()
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td
        className={`p-3 whitespace-nowrap ${
          stockWithData.changePercent >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {isLoading ? (
          <span className="text-muted-foreground">...</span>
        ) : stockWithData.price > 0 ? (
          <>
            {stockWithData.changePercent >= 0 ? "+" : ""}
            {stockWithData.changePercent.toFixed(2)}%
          </>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="p-3 whitespace-nowrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(stock.id);
          }}
          aria-label={`מחק ${stock.symbol}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
