"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SignInModal from "@/components/SignInModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Navbar() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Hide Navbar on main page when signed in (HeaderBar handles it)
  // Only show sign-in button when not authenticated
  if (isSignedIn) {
    return null;
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-end items-center">
          <Button
            onClick={() => setShowSignInModal(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all"
          >
            התחברות
          </Button>
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </nav>
  );
}
