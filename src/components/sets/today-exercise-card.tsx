import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatSetValue } from "@/lib/format-set";
import { useT } from "@/lib/i18n/context";
import type { TrackedField } from "@/lib/tracked-fields";

const PR_LABEL_KEYS = {
  reps: "today.prReps",
  time: "today.prTime",
  weight: "today.prWeight",
  volume: "today.prVolume",
} as const;

type TodaySet = {
  id: string;
  reps: number | null;
  timeSeconds: number | null;
  weightKg: number | null;
  isPr: boolean;
  prFields: TrackedField[];
  labelPrFields: boolean;
};

// The star names which record it is (e.g. "★ Weight + Volume") rather than
// using a color per field, which would need a legend to decode. Left as a
// bare star when the exercise has only one field that can be a record —
// nothing to disambiguate then.
function PrBadge({ set }: { set: TodaySet }) {
  const t = useT();
  if (!set.isPr) return null;
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-accent">
      <Star size={12} className="fill-accent text-accent" />
      {set.labelPrFields && set.prFields.map((field) => t(PR_LABEL_KEYS[field])).join(" + ")}
    </span>
  );
}

export function TodayExerciseCard({
  exerciseName,
  sets,
  onAddSet,
  onEditSet,
  expandedContent,
}: {
  exerciseName: string;
  sets: TodaySet[];
  // Omitted in read-only mode (admin viewing another user) — the card then
  // renders with no interactive controls.
  onAddSet?: () => void;
  onEditSet?: (setId: string) => void;
  expandedContent?: React.ReactNode;
}) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{exerciseName}</p>
        {onAddSet && (
          <Button variant="secondary" onClick={onAddSet}>
            {t("today.addSet")}
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
                {formatSetValue(set, t)}
                <PrBadge set={set} />
              </button>
            ) : (
              <div
                key={set.id}
                className="flex items-center gap-1 rounded-lg border border-card-border px-3 py-2 text-sm"
              >
                {formatSetValue(set, t)}
                <PrBadge set={set} />
              </div>
            ),
          )}
        </div>
      )}

      {expandedContent}
    </Card>
  );
}
