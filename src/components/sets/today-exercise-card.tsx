import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  expandedContent,
}: {
  exerciseName: string;
  sets: TodaySet[];
  prSetIds: Set<string>;
  // Omitted in read-only mode (admin viewing another user) — the card then
  // renders with no interactive controls.
  onAddSet?: () => void;
  onEditSet?: (setId: string) => void;
  expandedContent?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{exerciseName}</p>
        {onAddSet && (
          <Button variant="secondary" onClick={onAddSet}>
            + Set
          </Button>
        )}
      </div>

      {sets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sets.map((set) =>
            onEditSet ? (
              <button
                key={set.id}
                onClick={() => onEditSet(set.id)}
                className="flex items-center gap-1 rounded-lg border border-card-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 min-h-11"
              >
                {formatSetValue(set)}
                {prSetIds.has(set.id) && <Star size={12} className="fill-accent text-accent" />}
              </button>
            ) : (
              <div
                key={set.id}
                className="flex items-center gap-1 rounded-lg border border-card-border px-3 py-2 text-sm"
              >
                {formatSetValue(set)}
                {prSetIds.has(set.id) && <Star size={12} className="fill-accent text-accent" />}
              </div>
            ),
          )}
        </div>
      )}

      {expandedContent}
    </Card>
  );
}
