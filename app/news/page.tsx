"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { StrategyKitHeader } from "@/components/strategy-kit/StrategyKitHeader";
import { Button } from "@/components/ui/button";
import { ClearFinvizCacheButton } from "@/components/news/ClearFinvizCacheButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

type NewsTab = "general" | "focused";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: number;
}

const formatTimestamp = (publishedAt: number): string => {
  const date = new Date(publishedAt);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsTab>("general");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [generalNews, setGeneralNews] = useState<NewsArticle[]>([]);
  const [focusedNews, setFocusedNews] = useState<NewsArticle[]>([]);
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(false);
  const [isLoadingFocused, setIsLoadingFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const fetchMarketNews = useAction(api.combinedNews.fetchCombinedMarketNews);
  const fetchStockNews = useAction(api.combinedNews.fetchCombinedStockNews);

  // Get all user's stocks from their lists
  const userStocks = useQuery(
    api.stocksListsQueries.getAllUserStocks,
    user ? { userId: user.id } : "skip"
  );

  // Extract unique symbols from user stocks
  const trackedSymbols = useMemo(() => {
    if (!userStocks || userStocks.length === 0) return ["all"];
    const symbols = Array.from(new Set(userStocks.map((stock) => stock.symbol)));
    return ["all", ...symbols];
  }, [userStocks]);

  // Fetch general market news (combined from Yahoo Finance + Finviz)
  useEffect(() => {
    if (activeTab === "general") {
      setIsLoadingGeneral(true);
      fetchMarketNews({ limit: 40 })
        .then((articles) => {
          setGeneralNews(articles);
        })
        .catch((error) => {
          console.error("Error fetching general news:", error);
          setGeneralNews([]);
        })
        .finally(() => {
          setIsLoadingGeneral(false);
        });
    }
  }, [activeTab]);

  // Fetch focused news (combined from Yahoo Finance + Finviz)
  useEffect(() => {
    if (activeTab === "focused") {
      setIsLoadingFocused(true);

      if (selectedSymbol === "all" && userStocks && userStocks.length > 0) {
        // Fetch combined news for all user stocks
        const symbols = Array.from(new Set(userStocks.map((stock) => stock.symbol)));
        Promise.all(symbols.map((symbol) => fetchStockNews({ symbol, limit: 5 })))
          .then((results) => {
            const allNews = results.flat();
            // Already sorted by publishedAt in combined function
            setFocusedNews(allNews.slice(0, 40));
          })
          .catch((error) => {
            console.error("Error fetching focused news:", error);
            setFocusedNews([]);
          })
          .finally(() => {
            setIsLoadingFocused(false);
          });
      } else if (selectedSymbol !== "all") {
        // Fetch combined news for specific stock
        fetchStockNews({ symbol: selectedSymbol, limit: 40 })
          .then((articles) => {
            setFocusedNews(articles);
          })
          .catch((error) => {
            console.error("Error fetching focused news:", error);
            setFocusedNews([]);
          })
          .finally(() => {
            setIsLoadingFocused(false);
          });
      } else {
        setFocusedNews([]);
        setIsLoadingFocused(false);
      }
    }
  }, [activeTab, selectedSymbol, userStocks]);

  const generalColumns = useMemo(() => {
    const columnA: NewsArticle[] = [];
    const columnB: NewsArticle[] = [];

    generalNews.forEach((item, index) => {
      if (index % 2 === 0) {
        columnA.push(item);
      } else {
        columnB.push(item);
      }
    });

    return [columnA, columnB];
  }, [generalNews]);

  const focusedColumns = useMemo(() => {
    const columnA: NewsArticle[] = [];
    const columnB: NewsArticle[] = [];

    focusedNews.forEach((item, index) => {
      if (index % 2 === 0) {
        columnA.push(item);
      } else {
        columnB.push(item);
      }
    });

    return [columnA, columnB];
  }, [focusedNews]);

  return (
    <div className="flex min-h-screen flex-col bg-[#101010]" dir="rtl">
      <StrategyKitHeader title="News" />

      <main className="relative flex-1">
        {/* AI Chat Panel */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] max-w-[420px] border-l border-[#232323] bg-[#101010]"
          style={{ top: "calc(80px + 1rem)" }}
        >
          <div className="h-[calc(100vh-120px)] p-6">
            <div
              className="h-full rounded-2xl border border-[#2B2B2B] bg-[#161616]"
              style={{ boxShadow: "0 24px 50px rgba(0,0,0,0.45)", padding: "20px" }}
            >
              <AIChatPanel />
            </div>
          </div>
        </aside>

        <section ref={contentRef} className="pr-[calc(30%+4rem)] pl-[3.5rem] py-12">
          <div className="relative mb-8 flex items-center justify-center gap-3" dir="rtl">
            <div className="absolute left-0 flex items-center" dir="rtl">
              <DropdownMenu>
                <DropdownMenuTrigger asChild={true}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-full border-[#333] bg-[#181818] px-5 text-sm font-semibold text-[#CFCFCF] hover:bg-[#222222]"
                  >
                    {selectedSymbol === "all" ? "כל המניות" : selectedSymbol}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {trackedSymbols.length === 1 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      אין מניות ברשימות
                    </div>
                  ) : (
                    trackedSymbols.map((symbol) => (
                      <DropdownMenuItem
                        key={symbol}
                        className="text-right"
                        onClick={() => setSelectedSymbol(symbol)}
                      >
                        {symbol === "all" ? "כל המניות" : symbol}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              type="button"
              variant={activeTab === "general" ? "default" : "outline"}
              onClick={() => setActiveTab("general")}
              className={`h-9 rounded-full px-5 text-sm font-semibold transition ${
                activeTab === "general"
                  ? "bg-[#FF6B35] text-white hover:bg-[#FF7A46]"
                  : "border-[#333] bg-[#181818] text-[#CFCFCF] hover:bg-[#222222]"
              }`}
            >
              חדשות כלליות
            </Button>
            <Button
              type="button"
              variant={activeTab === "focused" ? "default" : "outline"}
              onClick={() => setActiveTab("focused")}
              className={`h-9 rounded-full px-5 text-sm font-semibold transition ${
                activeTab === "focused"
                  ? "bg-[#FF6B35] text-white hover:bg-[#FF7A46]"
                  : "border-[#333] bg-[#181818] text-[#CFCFCF] hover:bg-[#222222]"
              }`}
            >
              חדשות ממוקדות
            </Button>
          </div>

          {activeTab === "general" ? (
            <div className="flex gap-8" dir="rtl">
              {isLoadingGeneral ? (
                <div className="flex-1 space-y-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl border border-[#2C2C2C] bg-[#181818] animate-pulse"
                    />
                  ))}
                </div>
              ) : generalNews.length === 0 ? (
                <div className="flex-1 text-center py-12 text-muted-foreground">
                  <p>אין חדשות זמינות כרגע</p>
                </div>
              ) : (
                generalColumns.map((column, columnIndex) => (
                  <div key={`general-column-${columnIndex}`} className="flex flex-1 flex-col gap-2">
                    {column.map((item, index) => (
                      <a
                        key={`${item.url}-${index}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-[#2C2C2C] bg-[#181818] px-3 py-2 shadow-[0_10px_18px_rgba(0,0,0,0.32)] transition hover:border-[#FF6B35] hover:bg-[#1F1F1F]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex-1 text-[13px] leading-tight font-medium text-[#F4F4F4] group-hover:text-white line-clamp-2">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-[#9E9E9E] whitespace-nowrap">
                            {formatTimestamp(item.publishedAt)}
                          </span>
                        </div>
                        <span className="mt-1 inline-block text-[11px] text-[#FF6B35]">
                          {item.source}
                        </span>
                      </a>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex gap-8" dir="rtl">
              {isLoadingFocused ? (
                <div className="flex-1 space-y-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl border border-[#2C2C2C] bg-[#181818] animate-pulse"
                    />
                  ))}
                </div>
              ) : focusedNews.length === 0 ? (
                <div className="flex-1 text-center py-12 text-muted-foreground">
                  <p>אין חדשות זמינות</p>
                  {selectedSymbol === "all" && userStocks && userStocks.length === 0 && (
                    <p className="text-sm mt-2">הוסף מניות לרשימות כדי לראות חדשות</p>
                  )}
                </div>
              ) : (
                focusedColumns.map((column, columnIndex) => (
                  <div key={`focused-column-${columnIndex}`} className="flex flex-1 flex-col gap-2">
                    {column.map((item, index) => (
                      <a
                        key={`${item.url}-${index}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-[#2C2C2C] bg-[#181818] px-3 py-2 shadow-[0_10px_18px_rgba(0,0,0,0.32)] transition hover:border-[#FF6B35] hover:bg-[#1F1F1F]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex-1 text-[13px] leading-tight font-medium text-[#F4F4F4] group-hover:text-white line-clamp-2">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-[#9E9E9E] whitespace-nowrap">
                            {formatTimestamp(item.publishedAt)}
                          </span>
                        </div>
                        <span className="mt-1 inline-block text-[11px] text-[#FF6B35]">
                          {item.source}
                        </span>
                      </a>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
      <ClearFinvizCacheButton />
    </div>
  );
}
