"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  storageKey,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  storageKey: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Restore after mount (not during initial render) so server and client agree
  // on the first paint, then correct to whatever the user left it at last time.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`section-open:${storageKey}`);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // localStorage can throw (private browsing, blocked) — default state is fine.
    }
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`section-open:${storageKey}`, next ? "1" : "0");
      } catch {
        // ignore — nothing to persist to
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 rounded-xl border border-card-border px-4 py-3 hover:bg-card w-full"
      >
        <span className="text-base font-semibold">
          {title}
          {count !== undefined && <span className="text-sm text-muted font-normal"> ({count})</span>}
        </span>
        {open ? <ChevronUp size={22} className="text-muted shrink-0" /> : <ChevronDown size={22} className="text-muted shrink-0" />}
      </button>
      {open && <div className="flex flex-col gap-2 px-1">{children}</div>}
    </div>
  );
}
