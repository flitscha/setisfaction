"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { isPublicAuthPath } from "@/lib/auth-pages";
import { trpc } from "@/lib/trpc/client";

export function TopBar() {
  const pathname = usePathname();
  const isPublic = isPublicAuthPath(pathname);
  const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !isPublic });

  if (isPublic) {
    return null;
  }

  return (
    <header className="border-b border-card-border px-4 py-3 flex items-center justify-between">
      <p className="font-semibold">Setisfaction</p>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link href="/admin" aria-label="Admin" className="text-muted hover:text-foreground">
            <ShieldCheck size={20} />
          </Link>
        )}
        <LogoutButton>
          <LogOut size={20} />
        </LogoutButton>
      </div>
    </header>
  );
}
