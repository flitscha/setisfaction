"use client";

import { createContext, useContext, useEffect } from "react";
import { setViewAsUserId } from "@/lib/view-as";

type ViewAsUser = { userId: string; username: string };

const ViewAsContext = createContext<ViewAsUser | null>(null);

// Wraps every page under /admin/[userId]/* — the same page components used
// for the signed-in user's own routes render unchanged here. It tells the
// tRPC client to send the target user's id (picked up by readProcedure on
// the server) and gives components a way to detect read-only mode.
export function ViewAsProvider({ user, children }: { user: ViewAsUser; children: React.ReactNode }) {
  useEffect(() => {
    setViewAsUserId(user.userId);
    return () => setViewAsUserId(null);
  }, [user.userId]);

  return <ViewAsContext.Provider value={user}>{children}</ViewAsContext.Provider>;
}

// Null in normal usage; the target user when an admin is viewing their pages read-only.
export function useViewAsUser(): ViewAsUser | null {
  return useContext(ViewAsContext);
}

// Rewrites an app-relative path (e.g. "/exercises/groups") so internal links
// keep pointing into the admin view instead of the signed-in admin's own
// pages. Use this for every Link/router.push a shared page or component
// builds, so new features stay admin-viewable without extra wiring.
export function useAppPath(): (path: string) => string {
  const viewAsUser = useViewAsUser();
  return (path: string) => (viewAsUser ? `/admin/${viewAsUser.userId}${path}` : path);
}
