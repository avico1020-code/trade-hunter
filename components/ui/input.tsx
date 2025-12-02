import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#404040] bg-[#2a2a2a] px-3 py-2 text-base text-[#f5f5f5] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] focus-visible:ring-offset-2 focus-visible:border-[#ff6b35] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#1a1a1a] disabled:text-[#a1a1aa] md:text-sm",
          className
        )}
        ref={ref}
        suppressHydrationWarning={true}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
