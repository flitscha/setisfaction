// Shared between client and server: the header an admin's client sends while
// browsing another user's pages read-only, and the module-level store that
// header is read from (set by ViewAsProvider, read by the tRPC link).
export const VIEW_AS_HEADER = "x-view-as-user-id";

let viewAsUserId: string | null = null;

export function setViewAsUserId(userId: string | null) {
  viewAsUserId = userId;
}

export function getViewAsHeaders(): Record<string, string> {
  return viewAsUserId ? { [VIEW_AS_HEADER]: viewAsUserId } : {};
}
