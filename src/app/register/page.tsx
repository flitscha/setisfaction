"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { AuthShell, FormError, authInputClass } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { USERNAME_MAX_LENGTH, USERNAME_PATTERN } from "@/components/auth/finish-registration";
import { useT } from "@/lib/i18n/context";

const MIN_PASSWORD_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function signupRedirectUrl(username: string) {
  return `${window.location.origin}/auth/callback?flow=signup&username=${encodeURIComponent(username)}`;
}

export default function RegisterPage() {
  const utils = trpc.useUtils();
  const t = useT();
  const [step, setStep] = useState<"details" | "sent">("details");
  const [username, setUsername] = useState("");
  // Result of the last availability lookup; `available: null` means the
  // lookup itself failed (status stays unknown — submitting re-checks).
  const [lookup, setLookup] = useState<{ name: string; available: boolean | null } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; showLoginLinks?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedUsername = username.trim();
  const usernameStatus: UsernameStatus = !trimmedUsername
    ? "idle"
    : !USERNAME_PATTERN.test(trimmedUsername)
      ? "invalid"
      : lookup?.name !== trimmedUsername
        ? "checking"
        : lookup.available === null
          ? "idle"
          : lookup.available
            ? "available"
            : "taken";

  // Live feedback while typing, so a taken name shows up before submitting
  // the whole form.
  useEffect(() => {
    if (!trimmedUsername || !USERNAME_PATTERN.test(trimmedUsername)) return;
    const timeout = setTimeout(async () => {
      try {
        const { available } = await utils.auth.checkUsernameAvailable.fetch({ username: trimmedUsername });
        setLookup({ name: trimmedUsername, available });
      } catch {
        setLookup({ name: trimmedUsername, available: null });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [trimmedUsername, utils]);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = username.trim();
    if (!USERNAME_PATTERN.test(name)) {
      setError({ message: t("auth.usernameInvalidChars") });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError({ message: t("auth.passwordTooWeak") });
      return;
    }

    setIsSubmitting(true);
    try {
      const { available } = await utils.auth.checkUsernameAvailable.fetch({ username: name });
      if (!available) {
        setLookup({ name, available: false });
        setError({ message: t("auth.usernameTaken") });
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name }, emailRedirectTo: signupRedirectUrl(name) },
      });

      if (signUpError) {
        const code = (signUpError as { code?: string }).code;
        setError({
          message: describeError(signUpError, t),
          showLoginLinks: code === "user_already_exists" || code === "email_exists",
        });
        return;
      }

      // With email confirmation on, Supabase doesn't reveal an already-
      // registered (confirmed) email as an error — it returns a user with no
      // identities and sends nothing. Saying so beats a confirmation email
      // that never arrives.
      if (data.user && data.user.identities?.length === 0) {
        setError({ message: t("auth.emailAlreadyRegistered"), showLoginLinks: true });
        return;
      }

      setStep("sent");
    } catch (err) {
      setError({ message: describeError(err, t) });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "sent") {
    return <ConfirmationSent email={email.trim()} username={username.trim()} onChangeEmail={() => setStep("details")} />;
  }

  return (
    <AuthShell title={t("auth.createAccount")} subtitle={t("auth.registerSubtitle")}>
      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="relative">
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
              required
              className={`${authInputClass} pr-10`}
            />
            {usernameStatus === "available" && (
              <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent" aria-hidden />
            )}
          </div>
          <UsernameHint status={usernameStatus} />
        </div>

        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          required
          className={authInputClass}
        />

        <div className="flex flex-col gap-1">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder={t("auth.password")}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />
          <p className="text-xs text-muted px-1">{t("auth.passwordHint", { min: MIN_PASSWORD_LENGTH })}</p>
        </div>

        {error && (
          <div className="flex flex-col gap-1">
            <FormError>{error.message}</FormError>
            {error.showLoginLinks && (
              <div className="flex gap-3 text-sm">
                <Link href="/login" className="underline">
                  {t("auth.logIn")}
                </Link>
                <Link href="/forgot-password" className="underline text-muted">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            )}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting || usernameStatus === "taken"}>
          {isSubmitting ? t("auth.creating") : t("auth.createAccount")}
        </Button>

        <Link href="/login" className="text-sm text-muted text-center">
          {t("auth.alreadyHaveAccount")}
        </Link>
      </form>
    </AuthShell>
  );
}

function UsernameHint({ status }: { status: UsernameStatus }) {
  const t = useT();
  if (status === "taken") return <p className="text-xs text-red-600 px-1">{t("auth.usernameTaken")}</p>;
  if (status === "invalid") return <p className="text-xs text-red-600 px-1">{t("auth.usernameInvalidChars")}</p>;
  return <p className="text-xs text-muted px-1">{t("auth.usernameHint")}</p>;
}

function ConfirmationSent({ email, username, onChangeEmail }: { email: string; username: string; onChangeEmail: () => void }) {
  const t = useT();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  async function resend() {
    setError(null);
    setResendState("sending");
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: signupRedirectUrl(username) },
      });
      if (resendError) {
        setError(describeError(resendError, t));
        setResendState("idle");
        return;
      }
      setResendState("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describeError(err, t));
      setResendState("idle");
    }
  }

  return (
    <AuthShell title={t("auth.checkYourEmailTitle")}>
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck size={40} className="text-accent" aria-hidden />
        <p className="text-sm">{t("auth.confirmationSentTo", { email })}</p>
      </div>

      <ul className="text-sm text-muted flex flex-col gap-1.5 rounded-2xl border border-card-border bg-card p-4">
        <li>• {t("auth.checkSpamHint")}</li>
        <li>• {t("auth.linkAnyDeviceHint")}</li>
      </ul>

      {error && <FormError>{error}</FormError>}
      {resendState === "sent" && <p className="text-sm text-accent text-center">{t("auth.resent")}</p>}

      <Button variant="secondary" onClick={resend} disabled={cooldown > 0 || resendState === "sending"}>
        {resendState === "sending"
          ? t("auth.sending")
          : cooldown > 0
            ? t("auth.resendIn", { seconds: cooldown })
            : t("auth.resend")}
      </Button>

      <button type="button" onClick={onChangeEmail} className="text-sm text-muted text-center">
        {t("auth.wrongEmail")}
      </button>
    </AuthShell>
  );
}
