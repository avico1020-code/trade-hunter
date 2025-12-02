"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddIndexModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (symbol: string) => void;
}

export function AddIndexModal({ open, onOpenChange, onAdd }: AddIndexModalProps) {
  const [symbol, setSymbol] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onAdd(symbol.trim());
      setSymbol("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הוסף מדד</DialogTitle>
          <DialogDescription>הזן את סמל המדד שברצונך להוסיף</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">סמל המדד</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="לדוגמה: TA-35"
                autoFocus={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" variant="default" disabled={!symbol.trim()}>
              הוסף
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
