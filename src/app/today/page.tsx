"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { getLocalDayRange } from "@/lib/date";
import { ExercisePicker, type PickableExercise } from "@/components/sets/exercise-picker";
import { SetForm, type SetFormValues } from "@/components/sets/set-form";
import { TodayExerciseCard } from "@/components/sets/today-exercise-card";
import { Modal } from "@/components/ui/modal";

type EditingSet = {
  id: string;
  exerciseId: string;
  reps: number | null;
  timeSeconds: number | null;
  weightKg: number | null;
};

export default function TodayPage() {
  const { start, end } = useMemo(() => getLocalDayRange(), []);
  const utils = trpc.useUtils();
  const { data: todaySets } = trpc.set.listByDay.useQuery({ dayStart: start, dayEnd: end });

  const [showPicker, setShowPicker] = useState(false);
  const [activeExercise, setActiveExercise] = useState<PickableExercise | null>(null);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [prSetIds, setPrSetIds] = useState<Set<string>>(new Set());

  function markPr(setId: string, prFields: string[]) {
    if (prFields.length === 0) return;
    setPrSetIds((prev) => new Set(prev).add(setId));
  }

  const createSet = trpc.set.create.useMutation({
    onSuccess: async ({ set, prFields }) => {
      await utils.set.listByDay.invalidate();
      await utils.stats.aggregates.invalidate();
      markPr(set.id, prFields);
      setActiveExercise(null);
    },
  });

  const updateSet = trpc.set.update.useMutation({
    onSuccess: async ({ set, prFields }) => {
      await utils.set.listByDay.invalidate();
      markPr(set.id, prFields);
      setEditingSet(null);
    },
  });

  const deleteSet = trpc.set.delete.useMutation({
    onSuccess: async () => {
      await utils.set.listByDay.invalidate();
      setEditingSet(null);
    },
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        tracksReps: boolean;
        tracksTime: boolean;
        tracksWeight: boolean;
        sets: NonNullable<typeof todaySets>;
      }
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

  // A freshly picked exercise with no sets logged yet today gets a temporary
  // card at the top so the add-set form always appears inside a card.
  const displayGroups = useMemo(() => {
    if (activeExercise && !groups.some((g) => g.exerciseId === activeExercise.id)) {
      return [
        {
          exerciseId: activeExercise.id,
          exerciseName: activeExercise.name,
          tracksReps: activeExercise.tracksReps,
          tracksTime: activeExercise.tracksTime,
          tracksWeight: activeExercise.tracksWeight,
          sets: [] as NonNullable<typeof todaySets>,
        },
        ...groups,
      ];
    }
    return groups;
  }, [groups, activeExercise]);

  function handleCreateSet(values: SetFormValues) {
    if (!activeExercise) return;
    createSet.mutate({ exerciseId: activeExercise.id, ...values });
  }

  function handleUpdateSet(values: SetFormValues) {
    if (!editingSet) return;
    updateSet.mutate({ id: editingSet.id, ...values });
  }

  return (
    <main className="flex-1 p-4 pb-24 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold px-1">Today</h1>

      {displayGroups.length === 0 && (
        <p className="text-muted px-1">No sets logged yet today. Tap + to get started.</p>
      )}

      <div className="flex flex-col gap-3">
        {displayGroups.map((group) => {
          const isAdding = activeExercise?.id === group.exerciseId;
          const editingHere = editingSet !== null && group.sets.some((s) => s.id === editingSet.id);

          let expandedContent: React.ReactNode = null;
          if (isAdding) {
            expandedContent = (
              <SetForm
                key={`add-${group.exerciseId}`}
                exercise={group}
                onSubmit={handleCreateSet}
                isSubmitting={createSet.isPending}
                onCancel={() => setActiveExercise(null)}
              />
            );
          } else if (editingHere && editingSet) {
            expandedContent = (
              <SetForm
                key={`edit-${editingSet.id}`}
                exercise={group}
                initialValues={{
                  reps: editingSet.reps ?? undefined,
                  timeSeconds: editingSet.timeSeconds ?? undefined,
                  weightKg: editingSet.weightKg ?? undefined,
                }}
                onSubmit={handleUpdateSet}
                isSubmitting={updateSet.isPending}
                onCancel={() => setEditingSet(null)}
                onDelete={() => deleteSet.mutate({ id: editingSet.id })}
                isDeleting={deleteSet.isPending}
              />
            );
          }

          return (
            <TodayExerciseCard
              key={group.exerciseId}
              exerciseName={group.exerciseName}
              sets={group.sets}
              prSetIds={prSetIds}
              onAddSet={() => {
                setEditingSet(null);
                setActiveExercise({
                  id: group.exerciseId,
                  name: group.exerciseName,
                  tracksReps: group.tracksReps,
                  tracksTime: group.tracksTime,
                  tracksWeight: group.tracksWeight,
                });
              }}
              onEditSet={(setId) => {
                const set = group.sets.find((s) => s.id === setId);
                if (!set) return;
                setActiveExercise(null);
                setEditingSet({
                  id: set.id,
                  exerciseId: group.exerciseId,
                  reps: set.reps,
                  timeSeconds: set.timeSeconds,
                  weightKg: set.weightKg,
                });
              }}
              expandedContent={expandedContent}
            />
          );
        })}
      </div>

      {!activeExercise && !editingSet && (
        <button
          onClick={() => setShowPicker(true)}
          aria-label="Log exercise"
          className="fixed bottom-20 right-4 rounded-full bg-accent text-accent-foreground w-14 h-14 flex items-center justify-center shadow-lg"
        >
          <Plus size={28} />
        </button>
      )}

      {showPicker && (
        <Modal title="Log exercise" onClose={() => setShowPicker(false)}>
          <ExercisePicker
            onSelect={(exercise) => {
              setEditingSet(null);
              setActiveExercise(exercise);
              setShowPicker(false);
            }}
          />
        </Modal>
      )}
    </main>
  );
}
