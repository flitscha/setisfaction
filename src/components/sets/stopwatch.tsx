"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function Stopwatch({
  onStop,
  hasExistingValue,
}: {
  onStop: (seconds: number) => void;
  // True when a time is already entered — starting fresh would silently
  // overwrite it once stopped, so confirm first.
  hasExistingValue?: boolean;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Full-screen while running, so background content can't scroll underneath it.
  useEffect(() => {
    if (!isRunning) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isRunning]);

  function beginTiming() {
    startRef.current = Date.now();
    setElapsed(0);
    setIsRunning(true);
  }

  function handleStart() {
    if (hasExistingValue) {
      setConfirmRestart(true);
      return;
    }
    beginTiming();
  }

  function handleStop() {
    setIsRunning(false);
    onStop(elapsed);
  }

  if (isRunning) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-between py-10 px-6">
        <button
          type="button"
          onClick={() => setIsRunning(false)}
          className="self-start p-2 -m-2 text-sm text-muted"
        >
          Cancel
        </button>

        <p className="text-8xl font-semibold tabular-nums" aria-live="polite">
          {elapsed}s
        </p>

        <button
          type="button"
          onClick={handleStop}
          className="w-full max-w-xs h-28 rounded-full bg-accent text-accent-foreground text-3xl font-semibold shadow-lg active:brightness-90"
        >
          Stop
        </button>
      </div>
    );
  }

  if (confirmRestart) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted">Restart, replacing the current time?</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setConfirmRestart(false);
            beginTiming();
          }}
        >
          Restart
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmRestart(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={handleStart} className="whitespace-nowrap">
      Start
    </Button>
  );
}
