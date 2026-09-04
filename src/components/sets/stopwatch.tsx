"use client";

import { useEffect, useRef, useState } from "react";

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
      <button type="button" onClick={handleClick} className="border rounded px-3 py-1 text-sm whitespace-nowrap">
        {isRunning ? "Stop" : "Start"}
      </button>
      {isRunning && <span className="text-sm tabular-nums">{elapsed}s</span>}
    </div>
  );
}
