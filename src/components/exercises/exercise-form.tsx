"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GroupMultiSelect } from "./group-multi-select";
import { TrackedFieldsFieldset } from "./tracked-fields-fieldset";
import { useT } from "@/lib/i18n/context";

export type ExerciseFormValues = {
  name: string;
  description: string;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksWeight: boolean;
  groupIds: string[];
};

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

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
  const t = useT();
  const [values, setValues] = useState<ExerciseFormValues>(
    initialValues ?? {
      name: "",
      description: "",
      tracksReps: true,
      tracksTime: false,
      tracksWeight: false,
      groupIds: [],
    },
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!values.tracksReps && !values.tracksTime && !values.tracksWeight) {
      setValidationError(t("exercises.trackAtLeastOne"));
      return;
    }

    setValidationError(null);
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("exercises.name")}</span>
        <input
          type="text"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("exercises.description")}</span>
        <Textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder={t("exercises.descriptionPlaceholder")}
          rows={2}
          className={inputClass}
        />
      </label>

      <TrackedFieldsFieldset value={values} onChange={(fields) => setValues((v) => ({ ...v, ...fields }))} />

      <GroupMultiSelect
        selectedGroupIds={values.groupIds}
        onChange={(groupIds) => setValues((v) => ({ ...v, groupIds }))}
      />

      {(validationError || errorMessage) && <p className="text-red-600 text-sm">{validationError ?? errorMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("common.saving") : submitLabel}
      </Button>
    </form>
  );
}
