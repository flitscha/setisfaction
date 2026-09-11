"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";

// Full-screen countdown, mirroring Stopwatch's full-screen style but counting
// down instead of up. Leads with a congrats line and a big "REST" heading —
// not just a bare number — so it's immediately obvious what just happened
// (a set was logged) and what's happening now (a rest period started), for
// someone who glances at their phone mid-workout without reading closely.
// Auto-dismisses when it hits zero; Skip lets the user leave early.
export function RestTimer({
  seconds,
  exerciseName,
  setNumber,
  setsCount,
  onDone,
}: {
  seconds: number;
  exerciseName: string;
  setNumber: number;
  setsCount: number;
  onDone: () => void;
}) {
  const t = useT();
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
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium">{t("restTimer.nice", { exercise: exerciseName, n: setNumber, total: setsCount })}</p>
        <p className="text-4xl font-bold tracking-widest text-accent">{t("restTimer.rest")}</p>
      </div>

      <p className="text-8xl font-semibold tabular-nums" aria-live="polite">
        {remaining}s
      </p>

      <button
        type="button"
        onClick={onDone}
        className="w-full max-w-xs h-14 rounded-full border border-card-border text-lg font-medium active:brightness-90"
      >
        {t("restTimer.skip")}
      </button>
    </div>
  );
}
