"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeAuthEmailError } from "@/lib/supabase/errors";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function RegisterPage() {
  const utils = trpc.useUtils();
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
      setError("Username can only contain letters, numbers, underscores, and hyphens — no spaces.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);

    const { available } = await utils.auth.checkUsernameAvailable.fetch({ username });
    if (!available) {
      setIsSubmitting(false);
      setError("That username is already taken.");
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
      setError(describeAuthEmailError(signUpError));
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
          <h1 className="text-xl font-semibold">Create account</h1>
        </div>

        {step === "details" ? (
          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className={inputClass}
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create account"}
            </Button>

            <Link href="/login" className="text-sm text-muted text-center">
              Already have an account? Log in
            </Link>
          </form>
        ) : (
          <p className="text-sm text-muted text-center">
            We sent a confirmation link to <strong>{email}</strong>. Open it on this device to finish creating your
            account.
          </p>
        )}
      </div>
    </main>
  );
}
