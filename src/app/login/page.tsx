"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FormError, authInputClass } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { ChooseUsernameForm, useFinishRegistration } from "@/components/auth/finish-registration";
import { InstallAppHint } from "@/components/install/install-app-hint";
import { useT } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useT();
  const finishRegistration = useFinishRegistration();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsNewUsername, setNeedsNewUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // An email is used as-is; anything else is a username to look up.
      let email = identifier.trim();
      if (!email.includes("@")) {
        const resolved = await utils.auth.resolveLoginEmail.fetch({ username: email });
        if (resolved.pendingConfirmation) {
          setError(t("auth.emailNotConfirmed"));
          return;
        }
        if (!resolved.email) {
          setError(t("auth.usernameOrPasswordWrong"));
          return;
        }
        email = resolved.email;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(describeError(signInError, t));
        return;
      }

      const outcome = await finishRegistration();
      if (outcome === "username-taken") {
        setNeedsNewUsername(true);
        return;
      }
      router.push(outcome === "created" ? "/onboarding" : "/");
      router.refresh();
    } catch (err) {
      setError(describeError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsNewUsername) {
    return (
      <AuthShell title={t("auth.chooseNewUsernameTitle")} subtitle={t("auth.usernameTakenMeanwhile")}>
        <ChooseUsernameForm
          onDone={() => {
            router.push("/onboarding");
            router.refresh();
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Setisfaction" subtitle={t("auth.tagline")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder={t("auth.usernameOrEmail")}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className={authInputClass}
        />

        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder={t("auth.password")}
          autoComplete="current-password"
        />

        {error && <FormError>{error}</FormError>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("auth.loggingIn") : t("auth.logIn")}
        </Button>

        <Link href="/forgot-password" className="text-sm text-muted text-center -mt-1">
          {t("auth.forgotPassword")}
        </Link>
      </form>

      <div className="flex flex-col gap-2 border-t border-card-border pt-4">
        <p className="text-sm text-muted text-center">{t("auth.newHere")}</p>
        <Link
          href="/register"
          className="rounded-lg px-4 py-2.5 min-h-11 text-sm font-medium text-center border border-card-border hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t("auth.createAccount")}
        </Link>
      </div>

      <InstallAppHint collapsible />
    </AuthShell>
  );
}
