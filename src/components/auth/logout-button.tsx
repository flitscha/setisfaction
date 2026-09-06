"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ children, className }: { children?: React.ReactNode; className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Log out"
      className={className ?? "p-2 -m-2 text-muted hover:text-foreground"}
    >
      {children ?? "Log out"}
    </button>
  );
}
