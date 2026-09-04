export function TodayExerciseCard({
  exerciseName,
  sets,
  onAddSet,
}: {
  exerciseName: string;
  sets: { id: string; reps: number | null; timeSeconds: number | null; weightKg: number | null }[];
  onAddSet: () => void;
}) {
  const values = sets.map((set) => {
    const parts: string[] = [];
    if (set.reps !== null) parts.push(`${set.reps}`);
    if (set.timeSeconds !== null) parts.push(`${set.timeSeconds}s`);
    if (set.weightKg !== null) parts.push(`${set.weightKg}kg`);
    return parts.join(" / ");
  });

  return (
    <div className="border rounded px-4 py-3 flex items-center justify-between gap-2">
      <div>
        <p className="font-medium">{exerciseName}</p>
        <p className="text-sm text-gray-500">{values.join(" · ")}</p>
      </div>
      <button onClick={onAddSet} className="border rounded px-3 py-1 text-sm whitespace-nowrap">
        + Set
      </button>
    </div>
  );
}
