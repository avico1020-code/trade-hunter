"use client";

import { Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface List {
  id: string;
  name: string;
}

// Placeholder data - will be replaced with real data later
const placeholderLists: List[] = [
  { id: "1", name: "רשימה 1" },
  { id: "2", name: "רשימה 2" },
];

export function ListsGrid() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>(placeholderLists);
  const [counter, setCounter] = useState(() => placeholderLists.length);

  const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const handleAddList = () => {
    const nextIndex = counter + 1;
    const defaultName = `רשימה ${nextIndex}`;
    setLists((prevLists) => [
      ...prevLists,
      {
        id: createId(),
        name: defaultName,
      },
    ]);
    setCounter(nextIndex);
  };

  const handleRename = (id: string) => {
    const existing = lists.find((list) => list.id === id);
    const name = window.prompt("עדכן שם רשימה:", existing?.name ?? "");
    if (name === null) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setLists((prev) =>
      prev.map((list) =>
        list.id === id
          ? {
              ...list,
              name: trimmed,
            }
          : list
      )
    );
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("האם למחוק רשימה זו?");
    if (!confirmed) {
      return;
    }

    setLists((prev) => prev.filter((list) => list.id !== id));
  };

  const handleListClick = (id: string) => {
    // Navigate to stocks list page
    try {
      router.push("/stocks-list");
    } catch (error) {
      console.error("[ListsGrid] Navigation error:", error);
      // Fallback: use window.location if router.push fails
      window.location.href = "/stocks-list";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">רשימות</h2>
        <Button
          size="sm"
          variant="default"
          className="flex items-center gap-2"
          onClick={handleAddList}
        >
          <Plus className="h-4 w-4" />
          הוספת רשימה
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lists.map((list) => (
          <Card
            key={list.id}
            className="aspect-square relative cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleListClick(list.id)}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <h3 className="text-lg font-medium text-center">{list.name}</h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild={true}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    aria-label="אפשרויות רשימה"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click when clicking menu
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(list.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    שנה שם
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(list.id);
                    }}
                    className="text-destructive flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
