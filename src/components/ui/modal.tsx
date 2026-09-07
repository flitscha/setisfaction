"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
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

  // Portaled to the document body rather than rendered inline: a modal
  // opened from inside a <form> (the workout editor's exercise picker, e.g.)
  // would otherwise leave its content nested inside that form in the DOM —
  // any button in there without an explicit type="button" defaults to
  // type="submit" and silently submits (and closes) the whole page behind
  // it on click, which is exactly what picking an exercise or expanding a
  // group used to do before this existed.
  return createPortal(
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
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-muted hover:text-foreground">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
