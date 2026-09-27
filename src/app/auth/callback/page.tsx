"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { AuthShell, FormError } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { ChooseUsernameForm, useFinishRegistration } from "@/components/auth/finish-registration";
import { useT, type TranslationKey } from "@/lib/i18n/context";

const MIN_PASSWORD_LENGTH = 6;

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
  const t = useT();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");
  const finishRegistration = useFinishRegistration();

  const [status, setStatus] = useState<"working" | "error" | "set-password" | "choose-username">("working");
  // What went wrong, translated at render time rather than when it happened:
  // the effect below runs on mount, before LocaleProvider has switched to
  // the stored/browser locale, so a string built then would be in English.
  const [failure, setFailure] = useState<{ key: TranslationKey } | { error: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function fail(reason: { key: TranslationKey } | { error: unknown }) {
      if (cancelled) return;
      setStatus("error");
      setFailure(reason);
    }

    async function run() {
      try {
        const supabase = createClient();
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashErrorCode = hashParams.get("error_code");
        const code = searchParams.get("code");

        // An expired or already-used link — the most common case being
        // tapping the same confirmation link twice.
        if (hashErrorCode || hashParams.get("error")) {
          fail(flow === "signup" ? { key: "auth.signupLinkExpired" } : { error: { code: hashErrorCode ?? "otp_expired" } });
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) return fail({ error: sessionError });
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) return fail({ error: exchangeError });
        } else {
          return fail({ key: flow === "signup" ? "auth.signupLinkExpired" : "auth.linkInvalidOrExpired" });
        }

        if (cancelled) return;

        if (flow === "recovery") {
          setStatus("set-password");
          return;
        }

        if (flow === "signup") {
          const outcome = await finishRegistration();
          if (cancelled) return;
          if (outcome === "username-taken") {
            setStatus("choose-username");
            return;
          }
          router.push("/onboarding");
          router.refresh();
          return;
        }

        router.push("/today");
        router.refresh();
      } catch (err) {
        fail({ error: err });
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.passwordTooWeak"));
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(describeError(updateError, t));
        return;
      }
      router.push("/today");
      router.refresh();
    } catch (err) {
      setError(describeError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "choose-username") {
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
    <AuthShell title={status === "set-password" ? t("auth.resetPasswordTitle") : "Setisfaction"}>
      {status === "working" && <p className="text-sm text-muted text-center">{t("auth.finishingUp")}</p>}

      {status === "error" && (
        <>
          <p role="alert" className="text-red-600 text-sm text-center">
            {failure && ("key" in failure ? t(failure.key) : describeError(failure.error, t))}
          </p>
          <Button onClick={() => router.push("/login")}>{t("auth.backToLogin")}</Button>
          {flow === "signup" && (
            <Link href="/register" className="text-sm text-muted text-center">
              {t("auth.registerAgain")}
            </Link>
          )}
          {flow === "recovery" && (
            <Link href="/forgot-password" className="text-sm text-muted text-center">
              {t("auth.requestNewLink")}
            </Link>
          )}
        </>
      )}

      {status === "set-password" && (
        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
          <p className="text-sm text-muted text-center">{t("auth.chooseNewPassword")}</p>

          <div className="flex flex-col gap-1">
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder={t("auth.newPassword")}
              autoComplete="new-password"
              autoFocus
              minLength={MIN_PASSWORD_LENGTH}
            />
            <p className="text-xs text-muted px-1">{t("auth.passwordHint", { min: MIN_PASSWORD_LENGTH })}</p>
          </div>

          {error && <FormError>{error}</FormError>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("auth.setPassword")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
