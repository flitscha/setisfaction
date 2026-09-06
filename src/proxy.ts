import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicAuthPath } from "@/lib/auth-pages";
import { isSyntheticEmail } from "@/lib/username";

const VERIFY_EMAIL_PATH = "/verify-email";
const AUTH_CALLBACK_PATH = "/auth/callback";

// Protects every page except login/register, and refreshes the Supabase
// session cookie on each request so a signed-in user stays signed in.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicAuthPage = isPublicAuthPath(request.nextUrl.pathname);
  const isVerifyEmailPage = request.nextUrl.pathname.startsWith(VERIFY_EMAIL_PATH);
  const isAuthCallbackPage = request.nextUrl.pathname.startsWith(AUTH_CALLBACK_PATH);

  if (!user && !isPublicAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // /auth/callback is exempt from the rule below: the recovery link's fresh
  // session only gets applied client-side (via setSession, from tokens that
  // arrive in the URL hash — never sent to this server) once that page's
  // own JS runs, so this request still carries whatever session was already
  // active in the browser beforehand. Bouncing an already-signed-in visitor
  // away here would fire before that page ever gets the chance.
  if (user && isPublicAuthPage && !isAuthCallbackPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // An account created before real-email registration existed still has no
  // working email on file — forced through /verify-email before anything
  // else, once, rather than leaving it permanently unable to recover its
  // password. Checked straight from the session's email (no DB round trip).
  // /auth/callback exempted for the same reason as above: on the way back
  // from the "add your email" link, this request still carries the *old*
  // session (still synthetic) until that page's own JS applies the fresh
  // one from the URL hash.
  if (user && !isVerifyEmailPage && !isAuthCallbackPage && isSyntheticEmail(user.email ?? "")) {
    const url = request.nextUrl.clone();
    url.pathname = VERIFY_EMAIL_PATH;
    return NextResponse.redirect(url);
  }

  if (user && isVerifyEmailPage && !isSyntheticEmail(user.email ?? "")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/trpc|manifest.webmanifest|icon|apple-icon).*)",
  ],
};
