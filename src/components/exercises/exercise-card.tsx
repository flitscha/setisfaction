"use client";

import { useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

export function ExerciseCard({
  exercise,
  groupNames,
}: {
  exercise: {
    id: string;
    name: string;
    description: string | null;
    tracksReps: boolean;
    tracksTime: boolean;
    tracksWeight: boolean;
  };
  groupNames: string[];
}) {
  const [showDescription, setShowDescription] = useState(false);

  const trackedFields = [
    exercise.tracksReps && "Reps",
    exercise.tracksTime && "Time",
    exercise.tracksWeight && "Weight",
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-card-border">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <Link href={`/exercises/${exercise.id}`} className="flex-1 min-w-0">
          <p className="font-medium">{exercise.name}</p>
          {groupNames.length > 0 && <p className="text-sm text-muted">{groupNames.join(" · ")}</p>}
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {exercise.description && (
            <button
              onClick={() => setShowDescription((v) => !v)}
              aria-label="Show description"
              className="text-muted hover:text-foreground"
            >
              <Info size={16} />
            </button>
          )}
          <Link href={`/exercises/${exercise.id}`} className="text-sm text-muted whitespace-nowrap">
            {trackedFields.join(" · ")}
          </Link>
        </div>
      </div>
      {showDescription && exercise.description && (
        <p className="px-4 pb-3 text-sm text-muted whitespace-pre-wrap">{exercise.description}</p>
      )}
    </div>
  );
}
