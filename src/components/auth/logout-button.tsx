"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";

export function LogoutButton({ children, className }: { children?: React.ReactNode; className?: string }) {
  const router = useRouter();
  const t = useT();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
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
