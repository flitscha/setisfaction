// Supabase's own free-tier mail sender is capped at a low rate (a handful
// of emails per hour) — fine for a small friend group used to trickling in,
// but worth surfacing honestly rather than a generic "something went wrong"
// if several people happen to hit it around the same time.
type AuthErrorLike = { code?: string; status?: number; message: string } | null | undefined;

const RATE_LIMIT_MESSAGE =
  "We can only send a limited number of emails per hour right now — please wait a bit and try again.";

export function describeAuthEmailError(error: AuthErrorLike): string | null {
  if (!error) return null;
  if (error.code === "over_email_send_rate_limit" || (error.status === 429 && /rate limit/i.test(error.message))) {
    return RATE_LIMIT_MESSAGE;
  }
  return error.message;
}
