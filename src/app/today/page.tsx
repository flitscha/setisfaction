"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { getLocalDayRange } from "@/lib/date";
import { ExercisePicker, type PickableExercise } from "@/components/sets/exercise-picker";
import { SetForm, type SetFormValues } from "@/components/sets/set-form";
import { TodayExerciseCard } from "@/components/sets/today-exercise-card";

export default function TodayPage() {
  const { start, end } = useMemo(() => getLocalDayRange(), []);
  const utils = trpc.useUtils();
  const { data: todaySets } = trpc.set.listToday.useQuery({ dayStart: start, dayEnd: end });

  const [showPicker, setShowPicker] = useState(false);
  const [activeExercise, setActiveExercise] = useState<PickableExercise | null>(null);

  const createSet = trpc.set.create.useMutation({
    onSuccess: async () => {
      await utils.set.listToday.invalidate();
      await utils.exercise.listRecent.invalidate();
      setActiveExercise(null);
    },
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { exerciseId: string; exerciseName: string; tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean; sets: NonNullable<typeof todaySets> }
    >();

    for (const set of todaySets ?? []) {
      const existing = map.get(set.exerciseId);
      if (existing) {
        existing.sets.push(set);
      } else {
        map.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          tracksReps: set.tracksReps,
          tracksTime: set.tracksTime,
          tracksWeight: set.tracksWeight,
          sets: [set],
        });
      }
    }

    return Array.from(map.values());
  }, [todaySets]);

  function handleSubmitSet(values: SetFormValues) {
    if (!activeExercise) return;
    createSet.mutate({ exerciseId: activeExercise.id, ...values });
  }

  return (
    <main className="flex-1 p-6 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Today</h1>

      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <TodayExerciseCard
            key={group.exerciseId}
            exerciseName={group.exerciseName}
            sets={group.sets}
            onAddSet={() =>
              setActiveExercise({
                id: group.exerciseId,
                name: group.exerciseName,
                tracksReps: group.tracksReps,
                tracksTime: group.tracksTime,
                tracksWeight: group.tracksWeight,
              })
            }
          />
        ))}
        {groups.length === 0 && <p className="text-gray-500">No sets logged yet today.</p>}
      </div>

      {activeExercise && (
        <div>
          <p className="text-sm font-medium mb-2">{activeExercise.name}</p>
          <SetForm
            key={activeExercise.id}
            exercise={activeExercise}
            onSubmit={handleSubmitSet}
            isSubmitting={createSet.isPending}
            onCancel={() => setActiveExercise(null)}
          />
        </div>
      )}

      {!activeExercise &&
        (showPicker ? (
          <ExercisePicker
            onSelect={(exercise) => {
              setActiveExercise(exercise);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        ) : (
          <button onClick={() => setShowPicker(true)} className="border rounded px-3 py-2 text-sm">
            + Log exercise
          </button>
        ))}
    </main>
  );
}
