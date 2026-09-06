"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeAuthEmailError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// Forced on accounts created before real-email registration existed (see
// proxy.ts) — a one-time detour to add a working email, so password
// recovery becomes possible for accounts that otherwise have no way to
// receive mail at their synthetic @setisfaction.local address. Clicking the
// emailed link lands on /auth/callback, which finishes the job and sends
// them on to /today (at which point the proxy stops redirecting here).
export default function VerifyEmailPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/callback?flow=email_change` },
    );

    setIsSubmitting(false);

    if (updateError) {
      setError(describeAuthEmailError(updateError));
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
          <h1 className="text-xl font-semibold">Add your email</h1>
        </div>

        <p className="text-sm text-muted text-center">
          {me ? <>Hi {me.username} — </> : null}
          your account doesn&apos;t have a working email on file yet, so there&apos;s no way to reset your password if
          you forget it. Add one now — just this once.
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
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
              {isSubmitting ? "Sending…" : "Send confirmation link"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted text-center">
            We sent a confirmation link to <strong>{email}</strong>. Open it on this device to finish.
          </p>
        )}

        <LogoutButton className="text-sm text-muted text-center mx-auto">Log out instead</LogoutButton>
      </div>
    </main>
  );
}
