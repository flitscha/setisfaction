type TodaySet = { id: string; reps: number | null; timeSeconds: number | null; weightKg: number | null };

function formatSetValue(set: TodaySet): string {
  const parts: string[] = [];
  if (set.reps !== null) parts.push(`${set.reps}`);
  if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
  if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);
  return parts.join(" / ");
}

export function TodayExerciseCard({
  exerciseName,
  sets,
  prSetIds,
  onAddSet,
  onEditSet,
}: {
  exerciseName: string;
  sets: TodaySet[];
  prSetIds: Set<string>;
  onAddSet: () => void;
  onEditSet: (setId: string) => void;
}) {
  return (
    <div className="border rounded px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{exerciseName}</p>
        <button onClick={onAddSet} className="border rounded px-3 py-1 text-sm whitespace-nowrap">
          + Set
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sets.map((set) => (
          <button
            key={set.id}
            onClick={() => onEditSet(set.id)}
            className="border rounded px-2 py-1 text-sm hover:bg-gray-50"
          >
            {formatSetValue(set)}
            {prSetIds.has(set.id) && " ⭐"}
          </button>
        ))}
      </div>
    </div>
  );
}
