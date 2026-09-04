import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars are not set. Copy .env.example to .env.local and fill in your Supabase credentials.");
}

// For use in Server Components, Route Handlers, and the tRPC context — reads/writes
// the auth session via cookies so it survives across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll is called from a Server Component sometimes, where cookies can't be
            // written — safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    },
  );
}
