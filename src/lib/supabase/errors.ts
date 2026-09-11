// Supabase's own free-tier mail sender is capped at a low rate (a handful
// of emails per hour) — fine for a small friend group used to trickling in,
// but worth surfacing honestly rather than a generic "something went wrong"
// if several people happen to hit it around the same time.
type AuthErrorLike = { code?: string; status?: number; message: string } | null | undefined;

// `t` is threaded in (rather than imported) since this is a plain utility,
// not a component — it can't call the useT() hook itself.
export function describeAuthEmailError(error: AuthErrorLike, t: (key: "auth.emailRateLimited") => string): string | null {
  if (!error) return null;
  if (error.code === "over_email_send_rate_limit" || (error.status === 429 && /rate limit/i.test(error.message))) {
    return t("auth.emailRateLimited");
  }
  return error.message;
}
