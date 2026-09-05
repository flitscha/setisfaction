"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Locks background scroll while open — otherwise a scroll gesture outside
  // the modal can drag the page (and the modal along with it) on some
  // mobile browsers.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-card-border bg-background shadow-lg p-4 max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">{title}</p>
          <button onClick={onClose} aria-label="Close" className="p-2 -m-2 text-muted hover:text-foreground">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
