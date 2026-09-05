"use client";

import { useEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

// Grows with its content instead of exposing a manual resize handle, which is
// awkward to drag precisely on a touchscreen.
export function Textarea({ className = "", value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} className={`resize-none overflow-hidden ${className}`} {...props} />;
}
