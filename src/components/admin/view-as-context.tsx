"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getViewAsUser, setViewAsUser, subscribeViewAsUser, type ViewAsUser } from "@/lib/view-as";

// Null in normal usage; the target user when an admin is viewing their pages
// read-only. Backed by an external store (not React context) so components
// anywhere in the tree — notably TopBar/BottomNav, which render as siblings
// above where the admin route mounts — can react to it too.
export function useViewAsUser(): ViewAsUser {
  return useSyncExternalStore(subscribeViewAsUser, getViewAsUser, () => null);
}

// Rewrites an app-relative path (e.g. "/exercises/groups") so internal links
// keep pointing into the admin view instead of the signed-in admin's own
// pages. Use this for every Link/router.push a shared page or component
// builds, so new features stay admin-viewable without extra wiring.
export function useAppPath(): (path: string) => string {
  const viewAsUser = useViewAsUser();
  return (path: string) => (viewAsUser ? `/admin/${viewAsUser.userId}${path}` : path);
}

// Mounted once by /admin/[userId]/layout.tsx once the target user's identity
// is confirmed. Registers them in the store for the lifetime of that route.
export function ViewAsRegistration({ user }: { user: NonNullable<ViewAsUser> }) {
  useEffect(() => {
    setViewAsUser(user);
    return () => setViewAsUser(null);
  }, [user.userId, user.username]);

  return null;
}
