"use client";

import { useState } from "react";

export type ExerciseFormValues = {
  name: string;
  category: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
};

export function ExerciseForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  errorMessage,
}: {
  initialValues?: ExerciseFormValues;
  onSubmit: (values: ExerciseFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  errorMessage?: string | null;
}) {
  const [values, setValues] = useState<ExerciseFormValues>(
    initialValues ?? { name: "", category: "", tracksReps: true, tracksTime: false, tracksWeight: false },
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!values.tracksReps && !values.tracksTime && !values.tracksWeight) {
      setValidationError("Track at least one of reps, time, or weight.");
      return;
    }

    setValidationError(null);
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className="border rounded px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Category (optional)</span>
        <input
          type="text"
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          placeholder="e.g. Push-Up"
          className="border rounded px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium mb-1">Tracked fields</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.tracksReps}
            onChange={(e) => setValues((v) => ({ ...v, tracksReps: e.target.checked }))}
          />
          Reps
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.tracksTime}
            onChange={(e) => setValues((v) => ({ ...v, tracksTime: e.target.checked }))}
          />
          Time
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.tracksWeight}
            onChange={(e) => setValues((v) => ({ ...v, tracksWeight: e.target.checked }))}
          />
          Weight
        </label>
      </fieldset>

      {(validationError || errorMessage) && <p className="text-red-600 text-sm">{validationError ?? errorMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
