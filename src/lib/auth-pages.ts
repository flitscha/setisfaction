const PUBLIC_AUTH_PATHS = ["/login", "/register", "/forgot-password", "/auth/callback"];

// Pages reachable without a session — used by the proxy's redirect logic.
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
}

// Pages the layout chrome (TopBar/BottomNav) hides itself on — the public
// auth pages, plus /verify-email and /onboarding: both require a session,
// but are one-step detours (a forced one for /verify-email, see proxy.ts; an
// optional one-time prompt for /onboarding, see auth/callback's flow=signup
// branch), not normal pages to navigate away from via the bottom nav.
export function isChromelessPath(pathname: string): boolean {
  return isPublicAuthPath(pathname) || pathname.startsWith("/verify-email") || pathname.startsWith("/onboarding");
}
