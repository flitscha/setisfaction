"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 4000;

function formatTimestamp(date: Date): string {
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return isToday ? time : `${date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })} ${time}`;
}

// A single global room every registered user shares — simple polling rather
// than a realtime subscription, consistent with the rest of the app not
// needing any extra infrastructure. Only the most recent 100 messages exist
// at all (see chat.send), so there's never a "load more" here.
export function ChatPanel() {
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const { data: messages } = trpc.chat.list.useQuery(undefined, { refetchInterval: POLL_INTERVAL_MS });
  const send = trpc.chat.send.useMutation({
    onSuccess: () => {
      setBody("");
      utils.chat.list.invalidate();
    },
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    send.mutate({ body: trimmed });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto">
        {messages?.length === 0 && <p className="text-sm text-muted px-1">No messages yet — say hi.</p>}
        {messages?.map((m) => (
          <div key={m.id} className="rounded-lg border border-card-border px-3 py-2">
            <p className="text-xs text-muted mb-0.5">
              {m.username} · {formatTimestamp(m.createdAt)}
            </p>
            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 border border-card-border rounded-lg px-3 py-2.5 min-h-11 bg-transparent"
        />
        <Button type="submit" disabled={send.isPending || !body.trim()}>
          Send
        </Button>
      </form>
      {send.error && <p className="text-red-600 text-sm">{send.error.message}</p>}
    </div>
  );
}
