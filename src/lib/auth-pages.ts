const PUBLIC_AUTH_PATHS = ["/login", "/register"];

// Pages reachable without a session — shared between the proxy (redirect logic)
// and the layout chrome (which shouldn't show nav/logout on them).
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
}
