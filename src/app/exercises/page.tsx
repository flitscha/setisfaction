"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ExerciseCard } from "@/components/exercises/exercise-card";

export default function ExercisesPage() {
  const { data: exercises, isLoading } = trpc.exercise.list.useQuery();

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exercises</h1>
        <Link href="/exercises/new" className="text-sm underline">
          + New
        </Link>
      </div>

      {isLoading && <p>Loading…</p>}
      {exercises?.length === 0 && <p className="text-gray-500">No exercises yet.</p>}

      <div className="flex flex-col gap-2">
        {exercises?.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </main>
  );
}
