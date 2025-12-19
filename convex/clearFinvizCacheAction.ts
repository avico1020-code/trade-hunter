// Temporary file to clear Finviz cache - DELETE AFTER USE
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const clearFinvizCacheNow = action({
  handler: async (ctx) => {
    const result = await ctx.runMutation(internal.finvizNews.clearFinvizCache);
    return result;
  },
});

