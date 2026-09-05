import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-card-border bg-card shadow-sm p-4 ${className}`}
      {...props}
    />
  );
}
