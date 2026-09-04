import { createBrowserClient } from "@supabase/ssr";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars are not set. Copy .env.example to .env.local and fill in your Supabase credentials.");
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// The username-based login UI maps a username to a synthetic email, since
// Supabase Auth is email-based under the hood.
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@setisfaction.local`;
}
