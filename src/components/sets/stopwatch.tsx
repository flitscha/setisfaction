"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function Stopwatch({ onStop }: { onStop: (seconds: number) => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
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

  function handleClick() {
    if (isRunning) {
      setIsRunning(false);
      onStop(elapsed);
    } else {
      startRef.current = Date.now();
      setElapsed(0);
      setIsRunning(true);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleClick} className="whitespace-nowrap">
        {isRunning ? "Stop" : "Start"}
      </Button>
      {isRunning && <span className="text-sm tabular-nums text-muted">{elapsed}s</span>}
    </div>
  );
}
