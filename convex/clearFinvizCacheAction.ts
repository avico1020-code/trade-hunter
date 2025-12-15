// Temporary file to clear Finviz cache - DELETE AFTER USE

import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const clearFinvizCacheNow = action({
  handler: async (ctx) => {
    const result = await ctx.runMutation(internal.finvizNews.clearFinvizCache);
    return result;
  },
});
