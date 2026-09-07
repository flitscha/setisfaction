"use client";

import { useEffect, useState } from "react";

// Full-screen countdown, mirroring Stopwatch's full-screen style but counting
// down instead of up. Auto-dismisses when it hits zero; Skip lets the user
// leave early.
export function RestTimer({
  seconds,
  exerciseName,
  onDone,
}: {
  seconds: number;
  exerciseName: string;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const timeout = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remaining, onDone]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-between py-10 px-6">
      <p className="text-sm text-muted">Rest — {exerciseName}</p>
      <p className="text-8xl font-semibold tabular-nums" aria-live="polite">
        {remaining}s
      </p>
      <button
        type="button"
        onClick={onDone}
        className="w-full max-w-xs h-14 rounded-full border border-card-border text-lg font-medium active:brightness-90"
      >
        Skip
      </button>
    </div>
  );
}
