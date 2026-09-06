"use client";

import { useSyncExternalStore } from "react";
import { getFriendProfile, subscribeFriendProfile, type OpenFriendProfile } from "@/lib/friend-profile";

export function useFriendProfile(): OpenFriendProfile {
  return useSyncExternalStore(subscribeFriendProfile, getFriendProfile, () => null);
}
