"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeAuthEmailError } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// The emailed link lands on /auth/callback, which recognizes Supabase's
// PASSWORD_RECOVERY event and shows the "set a new password" form itself —
// this page's job ends at sending that email.
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?flow=recovery`,
    });
    setIsSubmitting(false);

    // Supabase deliberately doesn't reveal whether the email is on file —
    // any error other than a genuine rate limit is treated as success so
    // that stays true here too; the rate limit itself isn't an enumeration
    // risk, so it's fine (and more honest) to actually show that one.
    if (resetError?.code === "over_email_send_rate_limit") {
      setError(describeAuthEmailError(resetError));
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
          <h1 className="text-xl font-semibold">Reset password</h1>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted text-center">
              Enter the email you registered with — we&apos;ll send a link to reset your password.
            </p>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>

            <Link href="/login" className="text-sm text-muted text-center">
              Back to log in
            </Link>
          </form>
        ) : (
          <p className="text-sm text-muted text-center">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your password. Open it on this
            device.
          </p>
        )}
      </div>
    </main>
  );
}
