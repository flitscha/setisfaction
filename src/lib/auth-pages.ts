const PUBLIC_AUTH_PATHS = ["/login", "/register", "/forgot-password"];

// Pages reachable without a session — used by the proxy's redirect logic.
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
}

// Pages the layout chrome (TopBar/BottomNav) hides itself on — the public
// auth pages, plus /verify-email: that one does require a session, but it's
// a forced one-step detour (see proxy.ts), not a normal page to navigate
// away from via the bottom nav.
export function isChromelessPath(pathname: string): boolean {
  return isPublicAuthPath(pathname) || pathname.startsWith("/verify-email");
}
