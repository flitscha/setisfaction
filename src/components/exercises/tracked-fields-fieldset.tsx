"use client";

import { useT } from "@/lib/i18n/context";

export type TrackedFields = { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };

export function TrackedFieldsFieldset({
  value,
  onChange,
}: {
  value: TrackedFields;
  onChange: (value: TrackedFields) => void;
}) {
  const t = useT();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1">{t("exercises.trackedFieldsLegend")}</legend>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksReps}
          onChange={(e) => onChange({ ...value, tracksReps: e.target.checked })}
        />
        {t("exercises.trackReps")}
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksTime}
          onChange={(e) => onChange({ ...value, tracksTime: e.target.checked })}
        />
        {t("exercises.trackTime")}
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksWeight}
          onChange={(e) => onChange({ ...value, tracksWeight: e.target.checked })}
        />
        {t("exercises.trackWeight")}
      </label>
    </fieldset>
  );
}
