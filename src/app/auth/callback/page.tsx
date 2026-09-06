"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { PullUpIcon } from "@/components/icons/pull-up-icon";

const inputClass = "border border-card-border rounded-lg px-3 py-2 bg-transparent";

// Where every confirmation email's link points (register/verify-email/
// forgot-password all set emailRedirectTo/redirectTo to this page with a
// `flow` param) instead of asking the user to copy a code out of the
// email — Supabase's default templates only show a link, and editing them
// to show a code requires custom SMTP (see CLAUDE.md's Auth section).
//
// Supabase's own /auth/v1/verify endpoint (which the email link points at)
// verifies the token server-side and redirects back here with a fresh
// session — as `#access_token=&refresh_token=` in the hash, confirmed by
// testing against this project directly (not `?code=`, despite the
// browser client being configured for the PKCE flow — that only changes
// what a client-*initiated* flow produces, not what this
// admin/link-verification endpoint sends back). detectSessionInUrl won't
// pick up hash tokens for a PKCE-configured client, so both forms are
// handled explicitly here rather than relying on it.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");
  const username = searchParams.get("username");
  const completeRegistration = trpc.auth.completeRegistration.useMutation();

  const [status, setStatus] = useState<"working" | "error" | "set-password">("working");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description");
      const code = searchParams.get("code");

      if (hashError) {
        if (!cancelled) {
          setStatus("error");
          setError(hashError.replace(/\+/g, " "));
        }
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (!cancelled) {
            setStatus("error");
            setError(sessionError.message);
          }
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) {
            setStatus("error");
            setError(exchangeError.message);
          }
          return;
        }
      } else {
        if (!cancelled) {
          setStatus("error");
          setError("That link is invalid or has expired.");
        }
        return;
      }

      if (cancelled) return;

      if (flow === "recovery") {
        setStatus("set-password");
        return;
      }

      if (flow === "signup") {
        if (!username) {
          setStatus("error");
          setError("Missing username — please register again.");
          return;
        }
        try {
          await completeRegistration.mutateAsync({ username });
        } catch (err) {
          if (!cancelled) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
          return;
        }
      }

      if (!cancelled) {
        router.push("/today");
        router.refresh();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/today");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="rounded-full bg-accent text-accent-foreground w-12 h-12 flex items-center justify-center">
            <PullUpIcon size={24} />
          </div>
          <h1 className="text-xl font-semibold">Setisfaction</h1>
        </div>

        {status === "working" && <p className="text-sm text-muted text-center">Finishing up…</p>}

        {status === "error" && (
          <>
            <p className="text-red-600 text-sm text-center">{error}</p>
            <Button onClick={() => router.push("/login")}>Back to log in</Button>
          </>
        )}

        {status === "set-password" && (
          <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
            <p className="text-sm text-muted text-center">Choose a new password.</p>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
              minLength={6}
              className={inputClass}
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={inputClass}
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Set password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
