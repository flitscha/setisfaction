import type { TranslationKey } from "@/lib/i18n/context";

// `t` is threaded in (rather than imported) since this is a plain utility,
// not a component — it can't call the useT() hook itself.
type Translate = (key: TranslationKey) => string;

type ErrorLike = { name?: string; code?: string; status?: number; message?: string };

// Supabase Auth error codes worth a specific, translated message. Anything
// not listed falls back to a generic "something went wrong" rather than
// showing Supabase's raw English message.
const AUTH_ERROR_KEYS: Record<string, TranslationKey> = {
  // Supabase's own free-tier mail sender is capped at a few emails per
  // hour — worth surfacing honestly if several people hit it at once.
  over_email_send_rate_limit: "auth.emailRateLimited",
  over_request_rate_limit: "auth.tooManyAttempts",
  weak_password: "auth.passwordTooWeak",
  email_address_invalid: "auth.emailInvalid",
  email_exists: "auth.emailAlreadyRegistered",
  user_already_exists: "auth.emailAlreadyRegistered",
  same_password: "auth.samePassword",
  email_not_confirmed: "auth.emailNotConfirmed",
  invalid_credentials: "auth.usernameOrPasswordWrong",
  otp_expired: "auth.linkInvalidOrExpired",
  flow_state_expired: "auth.linkInvalidOrExpired",
  flow_state_not_found: "auth.linkInvalidOrExpired",
  bad_code_verifier: "auth.linkInvalidOrExpired",
  session_not_found: "auth.sessionExpired",
  refresh_token_not_found: "auth.sessionExpired",
  refresh_token_already_used: "auth.sessionExpired",
};

// fetch() rejects with a TypeError whose message differs per browser
// (Chrome / Firefox / Safari); auth-js wraps it as AuthRetryableFetchError.
const NETWORK_MESSAGE = /failed to fetch|networkerror|load failed|network request failed/i;

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const e = error as ErrorLike | null;
  if (!e) return false;
  return e.name === "AuthRetryableFetchError" || NETWORK_MESSAGE.test(e.message ?? "");
}

// Turns any error from a Supabase Auth call or a tRPC call into a message
// fit to show the user.
export function describeError(error: unknown, t: Translate): string {
  if (isNetworkError(error)) return t("errors.network");

  const e = (error ?? {}) as ErrorLike;
  if (e.code && e.code in AUTH_ERROR_KEYS) return t(AUTH_ERROR_KEYS[e.code]);
  if (e.status === 429) return /email/i.test(e.message ?? "") ? t("auth.emailRateLimited") : t("auth.tooManyAttempts");
  if (trpcErrorCode(error) === "UNAUTHORIZED") return t("auth.sessionExpired");
  if ((e.status !== undefined && e.status >= 500) || trpcErrorCode(error) === "INTERNAL_SERVER_ERROR") {
    return t("errors.server");
  }

  console.error(error);
  return t("errors.generic");
}

// A short technical identifier for an error (tRPC code, Supabase error code
// or error class), shown in small print under a generic message so a
// reported failure can actually be traced.
export function errorDetail(error: unknown): string | null {
  const e = (error ?? {}) as ErrorLike;
  const parts = [trpcErrorCode(error) ?? e.code, e.name !== "Error" && e.name !== "TRPCClientError" ? e.name : undefined, e.message]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .map((part) => part.slice(0, 120));
  return parts.length > 0 ? Array.from(new Set(parts)).join(" · ") : null;
}

// tRPC's error code (e.g. "CONFLICT"), for call sites that react to a
// specific server-side failure.
export function trpcErrorCode(error: unknown): string | undefined {
  return (error as { data?: { code?: string } } | null)?.data?.code;
}
