"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut, Mail, ShieldCheck, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { isPublicAuthPath } from "@/lib/auth-pages";
import { trpc } from "@/lib/trpc/client";
import { useViewAsUser } from "@/components/admin/view-as-context";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export function TopBar() {
  const pathname = usePathname();
  const isPublic = isPublicAuthPath(pathname);
  const viewAsUser = useViewAsUser();
  const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, { enabled: !isPublic });
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !isPublic && !viewAsUser });
  const { data: requestCount } = trpc.community.incomingRequestCount.useQuery(undefined, {
    enabled: !isPublic && !viewAsUser,
  });

  if (isPublic) {
    return null;
  }

  if (viewAsUser) {
    return (
      <header className="sticky top-0 z-30 bg-amber-500 text-amber-950 px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-1.5 p-2 -m-2 font-medium min-w-0">
          <ArrowLeft size={18} className="shrink-0" />
          <span className="truncate">{viewAsUser.username}</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <DeleteUserButton userId={viewAsUser.userId} username={viewAsUser.username} />
          <Link href="/today" aria-label="Exit read-only view" className="p-2 -m-2">
            <X size={20} />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-card-border px-4 py-3 flex items-center justify-between">
      <p className="font-semibold">Setisfaction</p>
      <div className="flex items-center gap-5">
        <Link href="/community" aria-label="Friends" className="relative text-muted hover:text-foreground">
          <Mail size={20} />
          {!!requestCount && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-medium">
              {requestCount}
            </span>
          )}
        </Link>
        {me && <span className="text-sm text-muted">{me.username}</span>}
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
