"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { ViewAsRegistration } from "@/components/admin/view-as-context";

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
    <>
      <ViewAsRegistration user={{ userId: user.userId, username: user.username }} />
      {children}
    </>
  );
}
