// Shared between client and server: the header an admin's client sends while
// browsing another user's pages read-only, and the external store that state
// lives in (readable/subscribable from anywhere via useViewAsUser, not just
// React-context descendants — see components/admin/view-as-context.tsx).
export const VIEW_AS_HEADER = "x-view-as-user-id";

export type ViewAsUser = { userId: string; username: string } | null;

let currentUser: ViewAsUser = null;
const listeners = new Set<() => void>();

export function setViewAsUser(user: ViewAsUser) {
  currentUser = user;
  listeners.forEach((listener) => listener());
}

export function getViewAsUser(): ViewAsUser {
  return currentUser;
}

export function subscribeViewAsUser(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getViewAsHeaders(): Record<string, string> {
  return currentUser ? { [VIEW_AS_HEADER]: currentUser.userId } : {};
}
