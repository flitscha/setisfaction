"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { openFriendProfile } from "@/lib/friend-profile";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

type Tab = "directory" | "friends" | "requests";
const TABS: Tab[] = ["directory", "friends", "requests"];

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("directory");
  const [query, setQuery] = useState("");
  const utils = trpc.useUtils();

  const { data: users } = trpc.community.listUsers.useQuery(undefined, { enabled: tab === "directory" });
  const { data: friends } = trpc.community.listFriends.useQuery(undefined, { enabled: tab === "friends" });
  const { data: incoming } = trpc.community.listIncomingRequests.useQuery(undefined, { enabled: tab === "requests" });
  const { data: outgoing } = trpc.community.listOutgoingRequests.useQuery(undefined, { enabled: tab === "requests" });
  const { data: requestCount } = trpc.community.incomingRequestCount.useQuery();

  function invalidateAll() {
    utils.community.listUsers.invalidate();
    utils.community.listFriends.invalidate();
    utils.community.listIncomingRequests.invalidate();
    utils.community.listOutgoingRequests.invalidate();
    utils.community.incomingRequestCount.invalidate();
  }

  const sendRequest = trpc.community.sendRequest.useMutation({ onSuccess: invalidateAll });
  const cancelRequest = trpc.community.cancelRequest.useMutation({ onSuccess: invalidateAll });
  const acceptRequest = trpc.community.acceptRequest.useMutation({ onSuccess: invalidateAll });
  const declineRequest = trpc.community.declineRequest.useMutation({ onSuccess: invalidateAll });
  const unfriend = trpc.community.unfriend.useMutation({ onSuccess: invalidateAll });

  const filteredUsers = (users ?? []).filter((u) => u.username.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold px-1">Community</h1>

      <div className="flex gap-2 px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border capitalize ${
              tab === t ? "bg-accent text-accent-foreground border-transparent" : ""
            }`}
          >
            {t}
            {t === "requests" && !!requestCount && ` (${requestCount})`}
          </button>
        ))}
      </div>

      {tab === "directory" && (
        <div className="flex flex-col gap-3">
          {users && users.length > 0 && <SearchInput value={query} onChange={setQuery} placeholder="Search users…" />}
          {users?.length === 0 && <p className="text-sm text-muted px-1">No other users yet.</p>}
          {users && users.length > 0 && filteredUsers.length === 0 && (
            <p className="text-sm text-muted px-1">No matching users.</p>
          )}
          <div className="flex flex-col gap-2">
            {filteredUsers.map((u) => (
              <div
                key={u.userId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                {u.status === "friends" ? (
                  <button
                    onClick={() => openFriendProfile({ userId: u.userId, username: u.username })}
                    className="font-medium truncate hover:underline"
                  >
                    {u.username}
                  </button>
                ) : (
                  <p className="font-medium truncate">{u.username}</p>
                )}

                {u.status === "none" && (
                  <Button
                    variant="secondary"
                    onClick={() => sendRequest.mutate({ userId: u.userId })}
                    disabled={sendRequest.isPending}
                  >
                    Add friend
                  </Button>
                )}
                {u.status === "outgoing" && (
                  <Button
                    variant="ghost"
                    onClick={() => cancelRequest.mutate({ userId: u.userId })}
                    disabled={cancelRequest.isPending}
                  >
                    Cancel request
                  </Button>
                )}
                {u.status === "incoming" && (
                  <div className="flex gap-2 shrink-0">
                    <Button onClick={() => acceptRequest.mutate({ userId: u.userId })} disabled={acceptRequest.isPending}>
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => declineRequest.mutate({ userId: u.userId })}
                      disabled={declineRequest.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {u.status === "friends" && <span className="text-sm text-muted whitespace-nowrap">✓ Friends</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "friends" && (
        <div className="flex flex-col gap-2">
          {friends?.length === 0 && (
            <p className="text-sm text-muted px-1">No friends yet — add someone from Directory.</p>
          )}
          {friends?.map((f) => (
            <div
              key={f.userId}
              className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
            >
              <button
                onClick={() => openFriendProfile({ userId: f.userId, username: f.username })}
                className="font-medium truncate hover:underline"
              >
                {f.username}
              </button>
              <Button variant="ghost" onClick={() => unfriend.mutate({ userId: f.userId })} disabled={unfriend.isPending}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium px-1">Incoming</p>
            {incoming?.length === 0 && <p className="text-sm text-muted px-1">Nothing pending.</p>}
            {incoming?.map((r) => (
              <div
                key={r.fromUserId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="font-medium truncate">{r.username}</p>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => acceptRequest.mutate({ userId: r.fromUserId })} disabled={acceptRequest.isPending}>
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => declineRequest.mutate({ userId: r.fromUserId })}
                    disabled={declineRequest.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium px-1">Sent</p>
            {outgoing?.length === 0 && <p className="text-sm text-muted px-1">Nothing pending.</p>}
            {outgoing?.map((r) => (
              <div
                key={r.toUserId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="font-medium truncate">{r.username}</p>
                <Button
                  variant="ghost"
                  onClick={() => cancelRequest.mutate({ userId: r.toUserId })}
                  disabled={cancelRequest.isPending}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
