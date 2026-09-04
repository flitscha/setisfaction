import Link from "next/link";

export function ExerciseCard({
  exercise,
}: {
  exercise: {
    id: string;
    name: string;
    category: string | null;
    tracksReps: boolean;
    tracksTime: boolean;
    tracksWeight: boolean;
  };
}) {
  const trackedFields = [
    exercise.tracksReps && "Reps",
    exercise.tracksTime && "Time",
    exercise.tracksWeight && "Weight",
  ].filter(Boolean);

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="border rounded px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
    >
      <div>
        <p className="font-medium">{exercise.name}</p>
        {exercise.category && <p className="text-sm text-gray-500">{exercise.category}</p>}
      </div>
      <p className="text-sm text-gray-500 whitespace-nowrap">{trackedFields.join(" · ")}</p>
    </Link>
  );
}
