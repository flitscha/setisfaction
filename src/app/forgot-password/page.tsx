"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeError, isNetworkError } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { AuthShell, FormError, authInputClass } from "@/components/auth/auth-shell";
import { useT } from "@/lib/i18n/context";

// The emailed link lands on /auth/callback, which recognizes Supabase's
// PASSWORD_RECOVERY event and shows the "set a new password" form itself —
// this page's job ends at sending that email.
export default function ForgotPasswordPage() {
  const t = useT();
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?flow=recovery`,
      });

      // Supabase deliberately doesn't reveal whether the email is on file —
      // any error other than a rate limit or a connection problem is treated
      // as success so that stays true here too; neither of those is an
      // enumeration risk, so it's fine (and more honest) to show them.
      if (resetError && (resetError.status === 429 || isNetworkError(resetError))) {
        setError(describeError(resetError, t));
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
    <AuthShell title={t("auth.resetPasswordTitle")}>
      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted text-center">{t("auth.resetPasswordHint")}</p>

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
            {isSubmitting ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>

          <Link href="/login" className="text-sm text-muted text-center">
            {t("auth.backToLogin")}
          </Link>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted text-center">{t("auth.resetLinkSentIfExists", { email })}</p>
          <p className="text-sm text-muted text-center">{t("auth.checkSpamHint")}</p>
          <Link href="/login" className="text-sm text-muted text-center underline">
            {t("auth.backToLogin")}
          </Link>
        </>
      )}
    </AuthShell>
  );
}
