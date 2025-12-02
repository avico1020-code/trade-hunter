import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartPanelProps {
  selectedStock?: {
    symbol: string;
    price: number;
    volume: number;
    changePercent: number;
  };
}

export function ChartPanel({ selectedStock }: ChartPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>גרף</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {selectedStock ? (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">{selectedStock.symbol}</p>
            <p className="text-sm text-muted-foreground">
              גרף עבור {selectedStock.symbol} יוצג כאן
            </p>
            {/* Chart will be implemented later */}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            בחר מניה מהרשימה כדי לראות את הגרף
          </p>
        )}
      </CardContent>
    </Card>
  );
}
