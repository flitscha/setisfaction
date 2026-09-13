"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stopwatch } from "./stopwatch";
import { useT } from "@/lib/i18n/context";

export type SetFormValues = {
  reps?: number;
  timeSeconds?: number;
  weightKg?: number;
};

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

export function SetForm({
  exercise,
  initialValues,
  onSubmit,
  isSubmitting,
  onCancel,
  onDelete,
  isDeleting,
}: {
  exercise: { tracksReps: boolean; tracksTime: boolean; tracksWeight: boolean };
  // Pre-fills each tracked field's input (still fully editable) — used both
  // for editing a past set and for a plan-driven set, where it's the plan's
  // target value the user can tweak before confirming (e.g. one extra rep).
  initialValues?: SetFormValues;
  onSubmit: (values: SetFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const t = useT();
  const showReps = exercise.tracksReps;
  const showTime = exercise.tracksTime;
  const showWeight = exercise.tracksWeight;

  const [reps, setReps] = useState(initialValues?.reps !== undefined ? String(initialValues.reps) : "");
  const [timeSeconds, setTimeSeconds] = useState(
    initialValues?.timeSeconds !== undefined ? String(initialValues.timeSeconds) : "",
  );
  const [weightKg, setWeightKg] = useState(initialValues?.weightKg !== undefined ? String(initialValues.weightKg) : "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  // A blank time is a real, deliberate option (e.g. a dynamic/progression
  // hold nobody wants to precisely measure) — but it's also exactly what an
  // accidental tap of "Save set" instead of "Start" would produce, and the
  // result is a near-invisible chip (see formatSetValue) with no way to
  // tell the two apart after the fact. Confirming once here catches both:
  // a genuine mis-tap gets a chance to be noticed, and a deliberate
  // untimed set is still just one more tap away.
  const [confirmNoTime, setConfirmNoTime] = useState(false);

  // Only guards freshly-entered, not-yet-saved values (create flow) — cancelling
  // an edit never loses anything, the previous values are still safely stored.
  const hasUnsavedEntry = !initialValues && ((showReps && reps !== "") || (showTime && timeSeconds !== "") || (showWeight && weightKg !== ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showTime && timeSeconds === "" && !confirmNoTime) {
      setConfirmNoTime(true);
      return;
    }
    onSubmit({
      reps: showReps && reps !== "" ? Number(reps) : undefined,
      timeSeconds: showTime && timeSeconds !== "" ? Number(timeSeconds) : undefined,
      weightKg: showWeight && weightKg !== "" ? Number(weightKg) : undefined,
    });
  }

  function handleTimeChange(value: string) {
    setTimeSeconds(value);
    if (confirmNoTime) setConfirmNoTime(false);
  }

  function handleCancelClick() {
    if (hasUnsavedEntry && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    onCancel();
  }

  function nudgeTime(delta: number) {
    setTimeSeconds((prev) => String(Math.max(0, Number(prev || 0) + delta)));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-card-border pt-3">
      {showReps && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("common.reps")}</span>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {showTime && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("common.timeSeconds")}</span>
          <input
            type="number"
            inputMode="numeric"
            value={timeSeconds}
            onChange={(e) => handleTimeChange(e.target.value)}
            className={inputClass}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Stopwatch
              onStop={(seconds) => handleTimeChange(String(seconds))}
              hasExistingValue={timeSeconds !== ""}
              onConfirmingRestartChange={setConfirmingRestart}
            />
            {timeSeconds !== "" && !confirmingRestart && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => nudgeTime(-1)}
                  aria-label={t("setForm.subtractSecond")}
                  className="rounded-lg border border-card-border px-3 py-2 text-sm min-h-11"
                >
                  −1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime(1)}
                  aria-label={t("setForm.addSecond")}
                  className="rounded-lg border border-card-border px-3 py-2 text-sm min-h-11"
                >
                  +1s
                </button>
              </div>
            )}
          </div>
        </label>
      )}

      {showWeight && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("common.weightKg")}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {confirmNoTime ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t("setForm.noTimeTitle")}</span>
          <Button type="submit" disabled={isSubmitting} className="ml-auto">
            {isSubmitting ? t("common.saving") : t("setForm.saveWithoutTime")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmNoTime(false)}>
            {t("setForm.keepEditing")}
          </Button>
        </div>
      ) : confirmCancel ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t("setForm.discardTitle")}</span>
          <Button type="button" variant="danger" onClick={onCancel} className="ml-auto">
            {t("setForm.discard")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>
            {t("setForm.keepEditing")}
          </Button>
        </div>
      ) : confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t("setForm.deleteTitle")}</span>
          <Button
            type="button"
            variant="primary"
            className="bg-red-600 text-white hover:brightness-110 ml-auto"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t("common.deleting") : t("common.confirm")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("setForm.saveSet")}
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancelClick}>
            {t("common.cancel")}
          </Button>
          {onDelete && (
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} className="ml-auto">
              {t("common.delete")}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
