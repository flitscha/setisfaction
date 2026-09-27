"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isChromelessPath } from "@/lib/auth-pages";
import { trpc } from "@/lib/trpc/client";
import { useViewAsUser } from "@/components/admin/view-as-context";

// Sends a signed-in account whose registration never completed (confirmed
// email, but auth.ensureRegistration didn't finish — e.g. the confirmation
// page failed or was closed early) to /onboarding, which completes it.
// Without this, such an account could use the app with no username, no
// default grouping and no onboarding until it happened to log in again.
export function RegistrationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const viewAsUser = useViewAsUser();
  const enabled = !isChromelessPath(pathname) && !viewAsUser;
  // Same query (and cache entry) as TopBar's — no extra request.
  const { data: me, isFetchedAfterMount } = trpc.auth.me.useQuery(undefined, { enabled });

  // Only trusted once fetched fresh: the persisted cache could still hold a
  // pre-registration snapshot.
  const needsRegistration = enabled && isFetchedAfterMount && me?.needsRegistration === true;

  useEffect(() => {
    if (needsRegistration) router.replace("/onboarding");
  }, [needsRegistration, router]);

  return null;
}
