import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "@/components/providers/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Hebrew RTL App",
  description: "Hebrew RTL Next.js Template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">
        <Providers>
          <Navbar />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
