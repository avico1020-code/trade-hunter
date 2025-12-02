import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountStatusPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>סטטוס חשבון</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">יתרה</span>
            <span className="font-semibold">₪0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">רווח/הפסד</span>
            <span className="font-semibold">₪0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">אחוזי רווח</span>
            <span className="font-semibold">0%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
