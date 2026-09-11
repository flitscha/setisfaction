"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { openFriendProfile } from "@/lib/friend-profile";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ChatPanel } from "@/components/community/chat-panel";
import { useT, type TranslationKey } from "@/lib/i18n/context";

type Tab = "everyone" | "friends" | "requests" | "chat";
const TABS: { value: Tab; labelKey: TranslationKey }[] = [
  { value: "everyone", labelKey: "community.tabEveryone" },
  { value: "friends", labelKey: "community.tabFriends" },
  { value: "requests", labelKey: "community.tabRequests" },
  { value: "chat", labelKey: "community.tabChat" },
];

export default function CommunityPage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("everyone");
  const [query, setQuery] = useState("");
  const [confirmUnfriendId, setConfirmUnfriendId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: users } = trpc.community.listUsers.useQuery(undefined, { enabled: tab === "everyone" });
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

  const sendRequest = trpc.community.sendRequest.useMutation({
    // Flips the button to "Cancel request" the instant it's tapped instead
    // of waiting on the round trip — the rare case where this was actually
    // an auto-accept (the other side had already sent a request) briefly
    // shows "outgoing" until the invalidate below corrects it to "friends".
    onMutate: async ({ userId }) => {
      await utils.community.listUsers.cancel();
      const previous = utils.community.listUsers.getData();
      utils.community.listUsers.setData(undefined, (old) =>
        old?.map((u) => (u.userId === userId ? { ...u, status: "outgoing" as const } : u)),
      );
      return { previous };
    },
    onError: (error, input, context) => {
      if (context?.previous) utils.community.listUsers.setData(undefined, context.previous);
    },
    onSettled: invalidateAll,
  });
  const cancelRequest = trpc.community.cancelRequest.useMutation({ onSuccess: invalidateAll });
  const acceptRequest = trpc.community.acceptRequest.useMutation({ onSuccess: invalidateAll });
  const declineRequest = trpc.community.declineRequest.useMutation({ onSuccess: invalidateAll });
  const unfriend = trpc.community.unfriend.useMutation({
    onSuccess: () => {
      setConfirmUnfriendId(null);
      invalidateAll();
    },
  });

  const filteredUsers = (users ?? []).filter((u) => u.username.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 py-2 -my-2 text-sm text-muted hover:text-foreground w-fit"
      >
        <ArrowLeft size={18} />
        {t("common.back")}
      </button>

      <h1 className="text-xl font-semibold px-1">{t("community.title")}</h1>

      <div className="flex gap-2 px-1">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.value}
            onClick={() => setTab(tabDef.value)}
            className={`text-sm rounded-lg px-3 py-2 min-h-11 border border-card-border ${
              tab === tabDef.value ? "bg-accent text-accent-foreground border-transparent" : ""
            }`}
          >
            {t(tabDef.labelKey)}
            {tabDef.value === "requests" && !!requestCount && ` (${requestCount})`}
          </button>
        ))}
      </div>

      {tab === "everyone" && (
        <div className="flex flex-col gap-3">
          {users && users.length > 0 && (
            <SearchInput value={query} onChange={setQuery} placeholder={t("community.searchPlaceholder")} />
          )}
          {users?.length === 0 && <p className="text-sm text-muted px-1">{t("community.noOtherUsers")}</p>}
          {users && users.length > 0 && filteredUsers.length === 0 && (
            <p className="text-sm text-muted px-1">{t("community.noMatchingUsers")}</p>
          )}
          <div className="flex flex-col gap-2">
            {filteredUsers.map((u) => (
              <div
                key={u.userId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="font-medium truncate">{u.username}</p>

                {u.status === "none" && (
                  <Button
                    variant="secondary"
                    onClick={() => sendRequest.mutate({ userId: u.userId })}
                    disabled={sendRequest.isPending}
                  >
                    {t("community.addFriend")}
                  </Button>
                )}
                {u.status === "outgoing" && (
                  <Button
                    variant="ghost"
                    onClick={() => cancelRequest.mutate({ userId: u.userId })}
                    disabled={cancelRequest.isPending}
                  >
                    {t("community.cancelRequest")}
                  </Button>
                )}
                {u.status === "incoming" && (
                  <div className="flex gap-2 shrink-0">
                    <Button onClick={() => acceptRequest.mutate({ userId: u.userId })} disabled={acceptRequest.isPending}>
                      {t("community.accept")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => declineRequest.mutate({ userId: u.userId })}
                      disabled={declineRequest.isPending}
                    >
                      {t("community.decline")}
                    </Button>
                  </div>
                )}
                {u.status === "friends" && (
                  <Button
                    variant="secondary"
                    onClick={() => openFriendProfile({ userId: u.userId, username: u.username })}
                  >
                    {t("community.profile")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "friends" && (
        <div className="flex flex-col gap-2">
          {friends?.length === 0 && <p className="text-sm text-muted px-1">{t("community.noFriendsYet")}</p>}
          {friends?.map((f) =>
            confirmUnfriendId === f.userId ? (
              <div
                key={f.userId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex flex-col gap-2"
              >
                <p className="text-sm">{t("community.removeFriendConfirm", { name: f.username })}</p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="bg-red-600 text-white hover:brightness-110"
                    onClick={() => unfriend.mutate({ userId: f.userId })}
                    disabled={unfriend.isPending}
                  >
                    {unfriend.isPending ? t("community.removing") : t("common.confirm")}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmUnfriendId(null)}>
                    {t("community.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={f.userId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="font-medium truncate">{f.username}</p>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" onClick={() => openFriendProfile({ userId: f.userId, username: f.username })}>
                    {t("community.profile")}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmUnfriendId(f.userId)}>
                    {t("community.remove")}
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium px-1">{t("community.incoming")}</p>
            {incoming?.length === 0 && <p className="text-sm text-muted px-1">{t("community.nothingPending")}</p>}
            {incoming?.map((r) => (
              <div
                key={r.fromUserId}
                className="rounded-2xl border border-card-border bg-card shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="font-medium truncate">{r.username}</p>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => acceptRequest.mutate({ userId: r.fromUserId })} disabled={acceptRequest.isPending}>
                    {t("community.accept")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => declineRequest.mutate({ userId: r.fromUserId })}
                    disabled={declineRequest.isPending}
                  >
                    {t("community.decline")}
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium px-1">{t("community.sent")}</p>
            {outgoing?.length === 0 && <p className="text-sm text-muted px-1">{t("community.nothingPending")}</p>}
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
                  {t("community.cancel")}
                </Button>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "chat" && <ChatPanel />}
    </main>
  );
}
