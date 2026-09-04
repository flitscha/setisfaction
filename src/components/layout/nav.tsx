"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";

export function Nav() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="border-b px-6 py-3 flex items-center justify-between">
      <div className="flex gap-4 text-sm">
        <Link href="/" className="underline">
          Home
        </Link>
        <Link href="/exercises" className="underline">
          Exercises
        </Link>
      </div>
      <LogoutButton />
    </nav>
  );
}
