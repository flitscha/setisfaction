"use client";

import { useState } from "react";
import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getViewAsHeaders, getViewAsUser } from "@/lib/view-as";
import { trpc } from "./client";

// A day-old cached value is still worth showing immediately on reopen;
// anything older is discarded rather than displayed as if it were current.
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

// Exported so logout can remove it directly — otherwise the next account
// signed into the same browser would see the previous one's cached data
// for a moment before every query refetches.
export const QUERY_CACHE_STORAGE_KEY = "setisfaction-query-cache";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers: getViewAsHeaders,
        }),
      ],
    }),
  );

  // Caches every query's last-known result to localStorage, so reopening
  // the installed PWA (very plausibly hours or days after it was last used)
  // shows real, correct-looking data immediately instead of "no sets logged
  // yet today" for the moment before the real fetch resolves. The fetch
  // itself always still runs regardless — this is still the online-only app
  // described in CLAUDE.md, just with a better-looking wait — and
  // useIsFetching() (see TopBar) shows a subtle indicator while it's in
  // flight, so stale-but-displayed data never reads as settled/current.
  // superjson (de)serializes so Date values (performedAt, etc.) survive the
  // round trip through a plain string, the same transformer already used on
  // the wire. Never persists anything fetched while an admin is browsing
  // another user's pages ("view as") — that data belongs to whoever's being
  // viewed, not to this device's own cache.
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: QUERY_CACHE_STORAGE_KEY,
      serialize: (client) => superjson.stringify(client),
      deserialize: (cached) => superjson.parse(cached),
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: MAX_CACHE_AGE_MS,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => getViewAsUser() === null && defaultShouldDehydrateQuery(query),
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  );
}
