/**
 * IBKR Integration Layer - News Service
 *
 * Manages news data from IBKR
 * - News providers
 * - Historical news headlines
 * - News article content
 */

import { getIbkrConnectionManager } from "./IbkrConnectionManager";
import { getIbkrContractsService } from "./IbkrContractsService";
import type {
  HistoricalNewsParams,
  IbkrContract,
  NewsArticle,
  NewsHeadline,
  NewsProvider,
} from "./types";

export class IbkrNewsService {
  private static instance: IbkrNewsService | null = null;
  private newsProvidersCache: NewsProvider[] | null = null;

  private constructor() {}

  static getInstance(): IbkrNewsService {
    if (!IbkrNewsService.instance) {
      IbkrNewsService.instance = new IbkrNewsService();
    }
    return IbkrNewsService.instance;
  }

  /**
   * Get available news providers
   * @param forceRefresh If true, bypass cache
   * @returns Array of news providers
   */
  async getNewsProviders(forceRefresh: boolean = false): Promise<NewsProvider[]> {
    if (!forceRefresh && this.newsProvidersCache) {
      return this.newsProvidersCache;
    }

    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Get news providers timeout after 10 seconds"));
      }, 10000);

      const providers: NewsProvider[] = [];
      let requestCompleted = false;

      const onNewsProviders = (
        newsProviders: Array<{ providerCode: string; providerName: string }>
      ) => {
        if (requestCompleted) return;

        providers.push(
          ...newsProviders.map((p) => ({
            code: p.providerCode,
            name: p.providerName,
          }))
        );
      };

      const onNewsProvidersEnd = () => {
        if (requestCompleted) return;
        requestCompleted = true;

        clearTimeout(timeout);
        (client as any).removeListener("newsProviders", onNewsProviders);
        (client as any).removeListener("newsProvidersEnd", onNewsProvidersEnd);
        (client as any).removeListener("error", onError);

        this.newsProvidersCache = providers;
        console.log(`[News Service] ✅ Received ${providers.length} news providers`);
        resolve(providers);
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("news") || err.message.includes("provider")) {
          clearTimeout(timeout);
          (client as any).removeListener("newsProviders", onNewsProviders);
          (client as any).removeListener("newsProvidersEnd", onNewsProvidersEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get news providers: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("newsProviders", onNewsProviders);
      (client as any).once("newsProvidersEnd", onNewsProvidersEnd);
      (client as any).once("error", onError);

      try {
        console.log(`[News Service] Requesting news providers...`);
        (client as any).reqNewsProviders();
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("newsProviders", onNewsProviders);
        (client as any).removeListener("newsProvidersEnd", onNewsProvidersEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request news providers: ${err.message}`));
      }
    });
  }

  /**
   * Get historical news headlines for a symbol
   * @param params Historical news parameters
   * @returns Array of news headlines
   */
  async getHistoricalNews(params: HistoricalNewsParams): Promise<NewsHeadline[]> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    // Resolve contract if needed
    const contractsService = getIbkrContractsService();
    const contract = await contractsService.resolveStockContract(params.symbol);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Get historical news timeout for ${params.symbol} after 15 seconds`));
      }, 15000);

      const headlines: NewsHeadline[] = [];
      let requestCompleted = false;

      const onHistoricalNews = (
        reqId: number,
        time: string,
        providerCode: string,
        articleId: string,
        headline: string
      ) => {
        if (requestCompleted) return;

        // Parse timestamp (IBKR format: "20231207  15:30:00")
        let timestamp: number;
        if (time.includes(" ")) {
          const [datePart, timePart] = time.split("  ");
          const year = parseInt(datePart.substring(0, 4), 10);
          const month = parseInt(datePart.substring(4, 6), 10) - 1;
          const day = parseInt(datePart.substring(6, 8), 10);
          const [hour, minute, second] = timePart.split(":").map((s) => parseInt(s, 10));
          timestamp = new Date(year, month, day, hour, minute, second).getTime();
        } else {
          timestamp = parseInt(time, 10) * 1000;
        }

        // Get provider name from cache
        const provider = this.newsProvidersCache?.find((p) => p.code === providerCode);

        headlines.push({
          articleId,
          headline,
          providerCode,
          providerName: provider?.name || providerCode,
          timestamp,
          relatedSymbols: [params.symbol],
        });
      };

      const onHistoricalNewsEnd = (reqId: number, hasMore: boolean) => {
        if (requestCompleted) return;
        requestCompleted = true;

        clearTimeout(timeout);
        (client as any).removeListener("historicalNews", onHistoricalNews);
        (client as any).removeListener("historicalNewsEnd", onHistoricalNewsEnd);
        (client as any).removeListener("error", onError);

        // Sort by timestamp (newest first)
        headlines.sort((a, b) => b.timestamp - a.timestamp);

        // Limit results if specified
        const limited = params.limit ? headlines.slice(0, params.limit) : headlines;

        console.log(
          `[News Service] ✅ Received ${limited.length} news headlines for ${params.symbol}`
        );
        resolve(limited);
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("news") || err.message.includes("historical")) {
          clearTimeout(timeout);
          (client as any).removeListener("historicalNews", onHistoricalNews);
          (client as any).removeListener("historicalNewsEnd", onHistoricalNewsEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get historical news: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("historicalNews", onHistoricalNews);
      (client as any).once("historicalNewsEnd", onHistoricalNewsEnd);
      (client as any).once("error", onError);

      try {
        const reqId = Math.floor(Math.random() * 10000) + 10000;

        // Format dates for IBKR (YYYYMMDD HH:MM:SS)
        const startTimeStr = this.formatDateForIBKR(params.startTime);
        const endTimeStr = this.formatDateForIBKR(params.endTime);

        console.log(
          `[News Service] Requesting historical news for ${params.symbol} from ${startTimeStr} to ${endTimeStr}...`
        );

        (client as any).reqHistoricalNews(
          reqId,
          {
            conId: contract.conId,
            symbol: contract.symbol,
            secType: contract.secType,
            exchange: contract.exchange,
            currency: contract.currency,
          },
          "", // providerCodes (empty = all providers)
          startTimeStr,
          endTimeStr,
          params.limit || 300 // max results
        );
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("historicalNews", onHistoricalNews);
        (client as any).removeListener("historicalNewsEnd", onHistoricalNewsEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request historical news: ${err.message}`));
      }
    });
  }

  /**
   * Get news article content
   * @param providerCode News provider code
   * @param articleId Article ID
   * @returns News article with body content
   */
  async getNewsArticle(providerCode: string, articleId: string): Promise<NewsArticle> {
    const connectionManager = getIbkrConnectionManager();
    await connectionManager.ensureConnected();
    const client = connectionManager.getClient();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Get news article timeout for ${articleId} after 10 seconds`));
      }, 10000);

      let article: NewsArticle | null = null;
      let requestCompleted = false;

      const onNewsArticle = (reqId: number, articleType: number, articleText: string) => {
        if (requestCompleted) return;

        // Get provider name from cache
        const provider = this.newsProvidersCache?.find((p) => p.code === providerCode);

        // We need to match this article with a headline to get full info
        // For now, create article from available data
        article = {
          articleId,
          headline: "", // Will be filled if we have headline data
          providerCode,
          providerName: provider?.name || providerCode,
          timestamp: Date.now(), // Will be filled if we have headline data
          body: articleText,
        };
      };

      const onNewsArticleEnd = () => {
        if (requestCompleted) return;
        requestCompleted = true;

        clearTimeout(timeout);
        (client as any).removeListener("newsArticle", onNewsArticle);
        (client as any).removeListener("newsArticleEnd", onNewsArticleEnd);
        (client as any).removeListener("error", onError);

        if (!article) {
          reject(new Error(`No article content received for ${articleId}`));
          return;
        }

        console.log(`[News Service] ✅ Received article content for ${articleId}`);
        resolve(article);
      };

      const onError = (err: Error, code: number) => {
        if (code === 200 || err.message.includes("news") || err.message.includes("article")) {
          clearTimeout(timeout);
          (client as any).removeListener("newsArticle", onNewsArticle);
          (client as any).removeListener("newsArticleEnd", onNewsArticleEnd);
          (client as any).removeListener("error", onError);

          reject(new Error(`Failed to get news article: ${err.message} (code: ${code})`));
        }
      };

      // Set up listeners
      (client as any).once("newsArticle", onNewsArticle);
      (client as any).once("newsArticleEnd", onNewsArticleEnd);
      (client as any).once("error", onError);

      try {
        const reqId = Math.floor(Math.random() * 10000) + 20000;

        console.log(`[News Service] Requesting article content for ${articleId}...`);
        (client as any).reqNewsArticle(reqId, providerCode, articleId, []);
      } catch (error) {
        clearTimeout(timeout);
        (client as any).removeListener("newsArticle", onNewsArticle);
        (client as any).removeListener("newsArticleEnd", onNewsArticleEnd);
        (client as any).removeListener("error", onError);

        const err = error instanceof Error ? error : new Error(String(error));
        reject(new Error(`Failed to request news article: ${err.message}`));
      }
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatDateForIBKR(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Get the singleton news service instance
 */
export function getIbkrNewsService(): IbkrNewsService {
  return IbkrNewsService.getInstance();
}
