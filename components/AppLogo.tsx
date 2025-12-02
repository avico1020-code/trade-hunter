"use client";

import Image from "next/image";
import Link from "next/link";

export function AppLogo() {
  return (
    <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
      <Image
        src="/logo-trade-hunter.svg"
        alt="Trade hunter logo"
        width={120}
        height={100}
        priority={true}
        className="h-14 w-auto"
      />
    </Link>
  );
}
