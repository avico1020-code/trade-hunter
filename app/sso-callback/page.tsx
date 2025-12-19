"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-300 text-lg" dir="rtl">
          מתחבר...
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
