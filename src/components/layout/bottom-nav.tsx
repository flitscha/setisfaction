"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Dumbbell, LineChart } from "lucide-react";
import { isPublicAuthPath } from "@/lib/auth-pages";

const TABS = [
  { path: "/today", label: "Today", icon: CalendarCheck },
  { path: "/exercises", label: "Exercises", icon: Dumbbell },
  { path: "/stats", label: "Stats", icon: LineChart },
];

export function BottomNav() {
  const pathname = usePathname();

  if (isPublicAuthPath(pathname)) {
    return null;
  }

  // Under /admin/[userId]/*, keep the tabs pointed at that user's read-only
  // view instead of the signed-in admin's own pages.
  const adminViewMatch = pathname.match(/^\/admin\/([^/]+)/);
  const basePath = adminViewMatch ? `/admin/${adminViewMatch[1]}` : "";

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-card-border bg-background flex">
      {TABS.map(({ path, label, icon: Icon }) => {
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
