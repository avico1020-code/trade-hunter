/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clearFinvizCacheAction from "../clearFinvizCacheAction.js";
import type * as clearYahooCache from "../clearYahooCache.js";
import type * as combinedNews from "../combinedNews.js";
import type * as doubleTopStrategies from "../doubleTopStrategies.js";
import type * as finvizNews from "../finvizNews.js";
import type * as ibkrCache from "../ibkrCache.js";
import type * as ibkrTWS from "../ibkrTWS.js";
import type * as marketData from "../marketData.js";
import type * as stocksLists from "../stocksLists.js";
import type * as stocksListsQueries from "../stocksListsQueries.js";
import type * as strategies from "../strategies.js";
import type * as tradeRouter from "../tradeRouter.js";
import type * as trades from "../trades.js";
import type * as userIndexPanels from "../userIndexPanels.js";
import type * as users from "../users.js";
import type * as yahooFinance from "../yahooFinance.js";
import type * as yahooFinanceQueries from "../yahooFinanceQueries.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  clearFinvizCacheAction: typeof clearFinvizCacheAction;
  clearYahooCache: typeof clearYahooCache;
  combinedNews: typeof combinedNews;
  doubleTopStrategies: typeof doubleTopStrategies;
  finvizNews: typeof finvizNews;
  ibkrCache: typeof ibkrCache;
  ibkrTWS: typeof ibkrTWS;
  marketData: typeof marketData;
  stocksLists: typeof stocksLists;
  stocksListsQueries: typeof stocksListsQueries;
  strategies: typeof strategies;
  tradeRouter: typeof tradeRouter;
  trades: typeof trades;
  userIndexPanels: typeof userIndexPanels;
  users: typeof users;
  yahooFinance: typeof yahooFinance;
  yahooFinanceQueries: typeof yahooFinanceQueries;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<typeof fullApiWithMounts, FunctionReference<any, "public">>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
