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

export function ExercisePicker({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: PickableExercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { data: all } = trpc.exercise.list.useQuery();
  const { data: recent } = trpc.exercise.listRecent.useQuery();

  const trimmedQuery = query.trim().toLowerCase();
  const list = trimmedQuery
    ? (all ?? []).filter((exercise) => exercise.name.toLowerCase().includes(trimmedQuery))
    : (recent ?? all ?? []);

  return (
    <div className="border rounded p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search exercise…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="border rounded px-3 py-2 flex-1 min-w-0"
        />
        <button onClick={onClose} className="text-sm underline whitespace-nowrap">
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {list.length === 0 && <p className="text-sm text-gray-500">No exercises found.</p>}
        {list.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => onSelect(exercise)}
            className="text-left border rounded px-3 py-2 hover:bg-gray-50"
          >
            {exercise.name}
          </button>
        ))}
      </div>
    </div>
  );
}
