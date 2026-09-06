// Username-based login/register map to a synthetic email under the hood,
// since Supabase Auth is email-based. Shared by both the browser client and
// the server-side admin registration flow so they always agree.
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@setisfaction.local`;
}

export function emailToUsername(email: string): string {
  return email.replace(/@setisfaction\.local$/, "");
}

// True for an account created before real-email registration existed —
// still logs in fine (see auth.resolveLoginEmail's fallback), but the proxy
// forces it through /verify-email before anything else, since there's no
// working email on file for password recovery.
export function isSyntheticEmail(email: string): boolean {
  return email.endsWith("@setisfaction.local");
}
