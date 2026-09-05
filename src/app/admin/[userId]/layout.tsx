"use client";

import { use } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ViewAsProvider } from "@/components/admin/view-as-context";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export default function AdminUserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data: user, isLoading, error } = trpc.admin.getUser.useQuery({ userId });

  if (isLoading) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">{error?.message ?? "User not found."}</p>
      </main>
    );
  }

  return (
    <ViewAsProvider user={{ userId: user.userId, username: user.username }}>
      <div className="sticky top-0 z-40 bg-amber-500/15 border-b-2 border-amber-500 px-4 py-2 flex flex-col gap-1.5 text-sm text-amber-800 dark:text-amber-400">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <ShieldAlert size={16} className="shrink-0" />
            <span className="truncate">
              Viewing <strong>{user.username}</strong> — read-only
            </span>
          </span>
          <DeleteUserButton userId={user.userId} username={user.username} />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="underline underline-offset-2">
            ← User overview
          </Link>
          <Link href="/today" className="underline underline-offset-2">
            Exit to my app
          </Link>
        </div>
      </div>
      {children}
    </ViewAsProvider>
  );
}
