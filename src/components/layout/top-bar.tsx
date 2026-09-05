"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { isPublicAuthPath } from "@/lib/auth-pages";

export function TopBar() {
  const pathname = usePathname();

  if (isPublicAuthPath(pathname)) {
    return null;
  }

  return (
    <header className="border-b border-card-border px-4 py-3 flex items-center justify-between">
      <p className="font-semibold">Setisfaction</p>
      <LogoutButton>
        <LogOut size={20} />
      </LogoutButton>
    </header>
  );
}
