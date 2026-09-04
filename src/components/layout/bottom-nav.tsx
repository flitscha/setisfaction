"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Dumbbell, LineChart } from "lucide-react";

const TABS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/stats", label: "Stats", icon: LineChart },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-card-border bg-background flex">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs ${
              isActive ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
