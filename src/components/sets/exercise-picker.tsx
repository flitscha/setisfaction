"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export type PickableExercise = {
  id: string;
  name: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
};

export function ExercisePicker({ onSelect }: { onSelect: (exercise: PickableExercise) => void }) {
  const [query, setQuery] = useState("");
  const { data: all } = trpc.exercise.list.useQuery();
  const { data: recent } = trpc.exercise.listRecent.useQuery();

  const trimmedQuery = query.trim().toLowerCase();
  const list = trimmedQuery
    ? (all ?? []).filter((exercise) => exercise.name.toLowerCase().includes(trimmedQuery))
    : (recent ?? all ?? []);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search exercise…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        className="border border-card-border rounded-lg px-3 py-2 bg-transparent"
      />

      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
        {list.length === 0 && <p className="text-sm text-muted">No exercises found.</p>}
        {list.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onSelect(exercise)}
            className="text-left rounded-lg border border-card-border px-3 py-2 hover:bg-card"
          >
            {exercise.name}
          </button>
        ))}
      </div>
    </div>
  );
}
