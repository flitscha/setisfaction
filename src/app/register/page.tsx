"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeAuthEmailError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";
import { useT } from "@/lib/i18n/context";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function RegisterPage() {
  const utils = trpc.useUtils();
  const t = useT();
  const [step, setStep] = useState<"details" | "sent">("details");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!USERNAME_PATTERN.test(username)) {
      setError(t("auth.usernameInvalidChars"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setIsSubmitting(true);

    const { available } = await utils.auth.checkUsernameAvailable.fetch({ username });
    if (!available) {
      setIsSubmitting(false);
      setError(t("auth.usernameTaken"));
      return;
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup&username=${encodeURIComponent(username)}`,
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(describeAuthEmailError(signUpError, t));
      return;
    }

    setStep("sent");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">{t("auth.createAccount")}</h1>
        </div>

        {step === "details" ? (
          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={t("auth.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className={inputClass}
            />

            <input
              type="email"
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />

            <input
              type="password"
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            <input
              type="password"
              placeholder={t("auth.confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("auth.creating") : t("auth.createAccount")}
            </Button>

            <Link href="/login" className="text-sm text-muted text-center">
              {t("auth.alreadyHaveAccount")}
            </Link>
          </form>
        ) : (
          <p className="text-sm text-muted text-center">{t("auth.confirmationSentTo", { email })}</p>
        )}
      </div>
    </main>
  );
}
