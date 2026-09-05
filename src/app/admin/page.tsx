"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export default function AdminPage() {
  const { data: isAdmin, isLoading: isLoadingRole } = trpc.admin.isAdmin.useQuery();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin === true });

  if (!isLoadingRole && !isAdmin) {
    return (
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <p className="text-muted">Not authorized.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck size={20} className="text-accent" />
        <h1 className="text-xl font-semibold">Users</h1>
      </div>

      {isLoading && <p className="text-muted px-1">Loading…</p>}

      <div className="flex flex-col gap-2">
        {users?.map((user) => (
          <Link
            key={user.userId}
            href={`/admin/${user.userId}`}
            className="rounded-lg border border-card-border bg-card px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="font-medium flex items-center gap-2">
                {user.username}
                {user.isAdmin && <span className="text-xs text-accent">Admin</span>}
              </p>
              <p className="text-xs text-muted">Joined {user.createdAt.toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-muted">{user.totalSets} sets</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
