"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground w-fit px-1"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
        {count !== undefined && <span className="text-xs">({count})</span>}
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}
