// Username-based login/register map to a synthetic email under the hood,
// since Supabase Auth is email-based. Shared by both the browser client and
// the server-side admin registration flow so they always agree.
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@setisfaction.local`;
}

export function emailToUsername(email: string): string {
  return email.replace(/@setisfaction\.local$/, "");
}
