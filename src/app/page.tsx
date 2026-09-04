"use client";

import { trpc } from "@/lib/trpc/client";

// Verifies the tRPC -> Drizzle -> Supabase wiring end to end.
export default function Home() {
  const { data, isLoading, error } = trpc.health.dbCheck.useQuery();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      {isLoading && <p>Checking database connection…</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}
      {data && <p>Database connection: {data.ok ? "OK" : "failed"}</p>}
    </main>
  );
}
