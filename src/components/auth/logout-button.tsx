"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { QUERY_CACHE_STORAGE_KEY } from "@/lib/trpc/provider";
import { useT } from "@/lib/i18n/context";

export function LogoutButton({ children, className }: { children?: React.ReactNode; className?: string }) {
  const router = useRouter();
  const t = useT();
  const queryClient = useQueryClient();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Clears both the in-memory and the persisted (localStorage) query
    // cache — otherwise the next account signed into this browser would
    // briefly see this one's cached data before every query refetches.
    queryClient.clear();
    try {
      localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
    } catch {
      // localStorage can throw (private browsing, blocked) — nothing to clean up then.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      aria-label={t("topBar.logOut")}
      className={className ?? "p-2 -m-2 text-muted hover:text-foreground"}
    >
      {children ?? t("topBar.logOut")}
    </button>
  );
}
