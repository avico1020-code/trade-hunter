"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts
        .filter((toast) => toast.open !== false)
        .map(({ id, title, description, action, variant, open, duration, ...props }) => (
          <div
            key={id}
            className={`
              group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all animate-in fade-in-0 slide-in-from-top-5 duration-300
              ${
                variant === "destructive"
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border bg-background text-foreground"
              }
              ${open === false ? "animate-out fade-out-0 slide-out-to-top-5" : ""}
            `}
            {...props}
          >
            <div className="grid gap-1">
              {title && <div className="text-sm font-semibold">{title}</div>}
              {description && <div className="text-sm opacity-90">{description}</div>}
            </div>
            {action}
          </div>
        ))}
    </div>
  );
}
