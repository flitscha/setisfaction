export type TrackedFields = { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };

export function TrackedFieldsFieldset({
  value,
  onChange,
}: {
  value: TrackedFields;
  onChange: (value: TrackedFields) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium mb-1">Tracked fields</legend>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksReps}
          onChange={(e) => onChange({ ...value, tracksReps: e.target.checked })}
        />
        Reps
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksTime}
          onChange={(e) => onChange({ ...value, tracksTime: e.target.checked })}
        />
        Time
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.tracksWeight}
          onChange={(e) => onChange({ ...value, tracksWeight: e.target.checked })}
        />
        Weight
      </label>
    </fieldset>
  );
}
