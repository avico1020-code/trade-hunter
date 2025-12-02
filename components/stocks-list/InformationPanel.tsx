"use client";

import { BarChart3, ExternalLink, Newspaper, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type TabType = "news" | "statistics" | "radar";

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: number;
}

interface InformationPanelProps {
  selectedStockSymbol?: string;
}

export function InformationPanel({ selectedStockSymbol }: InformationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("news");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const fetchNews = useAction(api.combinedNews.fetchCombinedStockNews);

  // Fetch combined news from Yahoo Finance + Finviz
  useEffect(() => {
    if (activeTab === "news" && selectedStockSymbol) {
      setIsLoadingNews(true);
      fetchNews({ symbol: selectedStockSymbol, limit: 20 })
        .then((articles) => {
          setNews(articles.map((a: any) => ({ ...a })));
        })
        .catch((error) => {
          console.error("Error fetching news:", error);
          setNews([]);
        })
        .finally(() => {
          setIsLoadingNews(false);
        });
    }
  }, [selectedStockSymbol, activeTab]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `לפני ${days} ${days === 1 ? "יום" : "ימים"}`;
    if (hours > 0) return `לפני ${hours} ${hours === 1 ? "שעה" : "שעות"}`;
    return "לפני פחות משעה";
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>חלונית מידע</CardTitle>
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === "news" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("news")}
            className="flex items-center gap-2"
          >
            <Newspaper className="h-4 w-4" />
            חדשות
          </Button>
          <Button
            variant={activeTab === "statistics" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("statistics")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            סטטיסטיקות
          </Button>
          <Button
            variant={activeTab === "radar" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("radar")}
            className="flex items-center gap-2"
          >
            <Radar className="h-4 w-4" />
            הרדאר
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {activeTab === "news" && (
          <div className="space-y-3">
            {!selectedStockSymbol ? (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">בחר מניה כדי לראות חדשות</p>
              </div>
            ) : isLoadingNews ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">אין חדשות זמינות עבור {selectedStockSymbol}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {news.map((article, index) => (
                  <a
                    key={index}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{article.source}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(article.publishedAt)}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "statistics" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">סטטיסטיקות על המניות</p>
            {/* Statistics content will go here */}
          </div>
        )}
        {activeTab === "radar" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">הרדאר מציג את המניות המעניינות</p>
            {/* Radar content will go here */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
