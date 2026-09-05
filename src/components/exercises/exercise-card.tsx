"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Hash, Timer, Dumbbell } from "lucide-react";

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

  return (
    <div className="rounded-xl border border-card-border">
      <div className="pl-4 pr-2 py-3 flex items-center justify-between gap-2">
        <Link href={`/exercises/${exercise.id}`} className="flex-1 min-w-0">
          <p className="font-medium">{exercise.name}</p>
          {groupNames.length > 0 && <p className="text-sm text-muted">{groupNames.join(" · ")}</p>}
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 text-muted" aria-label="Tracked fields">
            {exercise.tracksReps && <Hash size={18} aria-label="Tracks reps" />}
            {exercise.tracksTime && <Timer size={18} aria-label="Tracks time" />}
            {exercise.tracksWeight && <Dumbbell size={18} aria-label="Tracks weight" />}
          </div>
          {exercise.description && (
            <button
              onClick={() => setShowDescription((v) => !v)}
              aria-label={showDescription ? "Hide description" : "Show description"}
              aria-expanded={showDescription}
              className={`p-3 rounded-full ${showDescription ? "bg-card text-foreground" : "text-muted"}`}
            >
              <Info size={20} />
            </button>
          )}
        </div>
      </div>
      {showDescription && exercise.description && (
        <p className="px-4 pb-3 text-sm text-muted whitespace-pre-wrap">{exercise.description}</p>
      )}
    </div>
  );
}
