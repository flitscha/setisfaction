"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { AuthShell, FormError, authInputClass } from "@/components/auth/auth-shell";
import { useT } from "@/lib/i18n/context";

// Forced on accounts created before real-email registration existed (see
// proxy.ts) — a one-time detour to add a working email, so password
// recovery becomes possible for accounts that otherwise have no way to
// receive mail at their synthetic @setisfaction.local address. Clicking the
// emailed link lands on /auth/callback, which finishes the job and sends
// them on to /today (at which point the proxy stops redirecting here).
export default function VerifyEmailPage() {
  const t = useT();
  const { data: me } = trpc.auth.me.useQuery();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?flow=email_change` },
      );
      if (updateError) {
        setError(describeError(updateError, t));
        return;
      }
      setStep("sent");
    } catch (err) {
      setError(describeError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title={t("auth.addYourEmailTitle")}>
      <p className="text-sm text-muted text-center">
        {me ? t("auth.addEmailHintWithName", { username: me.username }) : t("auth.addEmailHintNoName")}
      </p>

      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
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

          {error && <FormError>{error}</FormError>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.sending") : t("auth.sendConfirmationLink")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted text-center">{t("auth.confirmationSentGeneric", { email })}</p>
      )}

      <LogoutButton className="text-sm text-muted text-center mx-auto">{t("topBar.logOutInstead")}</LogoutButton>
    </AuthShell>
  );
}
