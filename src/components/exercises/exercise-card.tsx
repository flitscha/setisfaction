"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import { useViewAsUser } from "@/components/admin/view-as-context";

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
  const [expanded, setExpanded] = useState(false);
  const isReadOnly = useViewAsUser() !== null;

  const trackedLabels = [
    exercise.tracksReps && "Reps",
    exercise.tracksTime && "Time",
    exercise.tracksWeight && "Weight",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-card-border bg-card shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full pl-4 pr-3 py-3 flex items-center justify-between gap-2 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium">{exercise.name}</p>
          {groupNames.length > 0 && <p className="text-sm text-muted">{groupNames.join(" · ")}</p>}
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-2 border-t border-card-border pt-3">
          {exercise.description && (
            <p className="text-sm text-muted whitespace-pre-wrap">{exercise.description}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted text-sm">Type: {trackedLabels}</p>

            {!isReadOnly && (
              <Link
                href={`/exercises/${exercise.id}`}
                className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm"
              >
                <Pencil size={14} />
                Edit
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
