// External store (not React context) for which friend's profile popup is
// open, so any component (directory row, friends list row, ...) can open it
// without prop-drilling — same pattern as view-as.ts.

export type OpenFriendProfile = { userId: string; username: string } | null;

let current: OpenFriendProfile = null;
const listeners = new Set<() => void>();

export function openFriendProfile(user: NonNullable<OpenFriendProfile>) {
  current = user;
  listeners.forEach((listener) => listener());
}

export function closeFriendProfile() {
  current = null;
  listeners.forEach((listener) => listener());
}

export function getFriendProfile(): OpenFriendProfile {
  return current;
}

export function subscribeFriendProfile(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
