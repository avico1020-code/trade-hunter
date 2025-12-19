"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRight, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface StocksListHeaderProps {
  // No props needed - we get strategies from Convex
}

export function StocksListHeader({}: StocksListHeaderProps) {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const activeStrategies = useQuery(api.stocksLists.getListStrategies);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const updatePosition = () => {
      if (buttonRef.current && isProfileOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 288;
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.right + window.scrollX - dropdownWidth,
        });
      }
    };

    if (isProfileOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isProfileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsProfileOpen(false);
  };

  return (
    <header className="w-full border-b bg-background p-4 overflow-visible">
      <div className="container mx-auto flex items-center justify-between overflow-visible">
        {/* Left side - Back button and Profile */}
        <div className="flex items-center gap-4 relative">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזור
          </Button>
          {isSignedIn && user ? (
            <>
              <Button
                ref={buttonRef}
                variant="ghost"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 hover:bg-accent rounded-lg px-3 py-2 h-auto"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">
                  שלום, {user.firstName || user.emailAddresses[0]?.emailAddress.split("@")[0]}
                </span>
              </Button>

              {isProfileOpen &&
                typeof window !== "undefined" &&
                createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed z-[100]"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                    }}
                  >
                    <Card className="w-72 shadow-lg border-border max-h-[calc(100vh-120px)] overflow-y-auto">
                      <CardContent className="p-0">
                        <div className="px-4 py-4 border-b border-border bg-muted/50">
                          <p className="text-sm font-semibold text-foreground mb-1">
                            {user.firstName || user.emailAddresses[0]?.emailAddress.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.emailAddresses[0]?.emailAddress}
                          </p>
                        </div>

                        <div className="p-2">
                          <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="w-full justify-start px-3 py-2 text-right hover:bg-destructive/10 text-destructive rounded-md"
                          >
                            <LogOut className="w-4 h-4 ml-2" />
                            <span className="text-sm font-medium">התנתק</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>,
                  document.body
                )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" aria-label="פרופיל">
                <User className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium">פרופיל</span>
            </>
          )}
        </div>

        {/* Center - Active Strategies */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-lg font-semibold">אסטרטגיות פעילות:</span>
          {!activeStrategies || activeStrategies.length === 0 ? (
            <span className="text-sm text-muted-foreground">לא נבחרו אסטרטגיות</span>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {activeStrategies.map((strategy) => (
                <span
                  key={strategy.id}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm border"
                >
                  {strategy.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side - Logo and Settings */}
        <div className="flex items-center gap-4">
          <AppLogo />
          <Button variant="ghost" size="icon" aria-label="הגדרות">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
