import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Orange fill (solid orange background, white text)
        default: "bg-[#ff6b35] text-white hover:bg-[#ff5722] hover:shadow-md active:scale-[0.98]",
        // Secondary: White fill (white background, dark gray text)
        secondary: "bg-white text-[#1a1a1a] hover:bg-[#f5f5f5] hover:shadow-md active:scale-[0.98]",
        // Outline: Dark gray with light gray border
        outline:
          "border border-[#404040] bg-[#1a1a1a] text-[#f5f5f5] hover:bg-[#2a2a2a] hover:border-[#505050]",
        // Orange outline: Dark gray with orange border and text
        orangeOutline:
          "border border-[#ff6b35] bg-[#1a1a1a] text-[#ff6b35] hover:bg-[#2a2a2a] hover:border-[#ff5722] hover:text-[#ff5722]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        ghost: "hover:bg-[#2a2a2a] hover:text-[#f5f5f5] text-[#f5f5f5]",
        link: "text-[#ff6b35] underline-offset-4 hover:underline hover:text-[#ff5722]",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-lg",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning={true}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
