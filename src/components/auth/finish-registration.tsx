"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { describeError, trpcErrorCode } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { FormError, authInputClass } from "@/components/auth/auth-shell";
import { useT } from "@/lib/i18n/context";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const USERNAME_MAX_LENGTH = 50;

export type FinishRegistrationOutcome = "created" | "existing" | "username-taken";

// Runs auth.ensureRegistration for the just-signed-in account (see that
// procedure) — "username-taken" means someone else claimed the name
// between signup and now, and the user has to pick another one via
// ChooseUsernameForm. Any other failure is thrown.
export function useFinishRegistration() {
  const ensureRegistration = trpc.auth.ensureRegistration.useMutation();

  return async function finishRegistration(): Promise<FinishRegistrationOutcome> {
    try {
      const { created } = await ensureRegistration.mutateAsync({});
      return created ? "created" : "existing";
    } catch (err) {
      if (trpcErrorCode(err) === "CONFLICT") return "username-taken";
      throw err;
    }
  };
}

export function ChooseUsernameForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const ensureRegistration = trpc.auth.ensureRegistration.useMutation();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!USERNAME_PATTERN.test(username)) {
      setError(t("auth.usernameInvalidChars"));
      return;
    }
    try {
      await ensureRegistration.mutateAsync({ username });
      onDone();
    } catch (err) {
      setError(trpcErrorCode(err) === "CONFLICT" ? t("auth.usernameTaken") : describeError(err, t));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder={t("auth.username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={USERNAME_MAX_LENGTH}
        autoFocus
        required
        className={authInputClass}
      />
      {error && <FormError>{error}</FormError>}
      <Button type="submit" disabled={ensureRegistration.isPending}>
        {ensureRegistration.isPending ? t("common.saving") : t("category.continue")}
      </Button>
    </form>
  );
}
