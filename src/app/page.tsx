"use client";

import { trpc } from "@/lib/trpc/client";
import { LogoutButton } from "@/components/auth/logout-button";

// Verifies the tRPC -> Drizzle -> Supabase wiring end to end.
export default function Home() {
  const { data, isLoading, error } = trpc.health.dbCheck.useQuery();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      {isLoading && <p>Checking database connection…</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}
      {data && <p>Database connection: {data.ok ? "OK" : "failed"}</p>}
      <LogoutButton />
    </main>
  );
}
