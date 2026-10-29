"use client";

import { Star } from "lucide-react";
import { effectivePrFields } from "@/lib/pr";
import { availableTrackedFields, type TrackedField } from "@/lib/stats";
import { useT } from "@/lib/i18n/context";
import type { TrackedFields } from "./tracked-fields-fieldset";

const LABEL_KEYS = {
  reps: "exercises.prFieldReps",
  time: "exercises.prFieldTime",
  weight: "exercises.prFieldWeight",
  volume: "exercises.prFieldVolume",
} as const;

// Which values earn a set the PR star. Driven by the form's *current*
// tracked fields (not the saved ones), so ticking "weight" above makes
// "heaviest weight"/"volume" show up here right away. `value` null/undefined means
// "never chosen" and shows the default; the first click turns it into an
// explicit choice. Hidden entirely when there's only one candidate — nothing
// to choose then.
export function PrFieldsFieldset({
  tracked,
  value,
  onChange,
}: {
  tracked: TrackedFields;
  value: TrackedField[] | null | undefined;
  onChange: (value: TrackedField[]) => void;
}) {
  const t = useT();
  const available = availableTrackedFields(tracked);
  if (available.length < 2) return null;

  const selected = effectivePrFields(tracked, value);

  function toggle(field: TrackedField, checked: boolean) {
    onChange(checked ? available.filter((f) => f === field || selected.includes(f)) : selected.filter((f) => f !== field));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1 flex items-center gap-1">
        <Star size={14} className="fill-accent text-accent" />
        {t("exercises.prFieldsLegend")}
      </legend>
      <p className="text-xs text-muted -mt-1 mb-1">{t("exercises.prFieldsHint")}</p>
      {available.map((field) => {
        const checked = selected.includes(field);
        return (
          <label key={field} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checked}
              // At least one has to count, or no set could ever be a PR.
              disabled={checked && selected.length === 1}
              onChange={(e) => toggle(field, e.target.checked)}
            />
            {t(LABEL_KEYS[field])}
          </label>
        );
      })}
    </fieldset>
  );
}
