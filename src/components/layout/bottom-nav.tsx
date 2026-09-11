"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarClock, LineChart } from "lucide-react";
import { isChromelessPath } from "@/lib/auth-pages";
import { PullUpIcon } from "@/components/icons/pull-up-icon";
import { useT, type TranslationKey } from "@/lib/i18n/context";

const TABS: { path: string; labelKey: TranslationKey; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { path: "/today", labelKey: "nav.today", icon: CalendarCheck },
  { path: "/plans", labelKey: "nav.plans", icon: CalendarClock },
  { path: "/exercises", labelKey: "nav.exercises", icon: PullUpIcon },
  { path: "/stats", labelKey: "nav.stats", icon: LineChart },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  if (isChromelessPath(pathname)) {
    return null;
  }

  // Under /admin/[userId]/*, keep the tabs pointed at that user's read-only
  // view instead of the signed-in admin's own pages.
  const adminViewMatch = pathname.match(/^\/admin\/([^/]+)/);
  const basePath = adminViewMatch ? `/admin/${adminViewMatch[1]}` : "";

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-card-border bg-background flex">
      {TABS.map(({ path, labelKey, icon: Icon }) => {
        const href = `${basePath}${path}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={path}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs ${
              isActive ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={24} />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
