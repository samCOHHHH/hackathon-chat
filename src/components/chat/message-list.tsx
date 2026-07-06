"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquareDashed } from "lucide-react";
import { MessageItem } from "@/components/chat/message-item";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDayDivider } from "@/lib/format-time";
import { apiPost } from "@/lib/fetcher";
import type { MessageDTO } from "@/lib/message-dto";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  members,
  currentUserId,
  canModerate,
  onReply,
  emptyLabel,
}: {
  messages: MessageDTO[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  members: { id: string; name: string }[];
  currentUserId: string;
  canModerate: boolean;
  onReply: (message: MessageDTO) => void;
  emptyLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [shouldStickToBottom, setShouldStickToBottom] = useState(true);
  const lastReadMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (shouldStickToBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldStickToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShouldStickToBottom(nearBottom);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) onLoadMore();
      },
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastReadMessageId.current || last.sender.id === currentUserId) return;
    lastReadMessageId.current = last.id;
    apiPost(`/api/messages/${last.id}/read`).catch(() => {});
  }, [messages, currentUserId]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <MessageSquareDashed className="h-10 w-10" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  const rows = messages.reduce<{ message: MessageDTO; showDivider: boolean; showHeader: boolean; day: string }[]>(
    (acc, message, i) => {
      const prev = messages[i - 1];
      const day = formatDayDivider(message.createdAt);
      const showDivider = day !== (acc[i - 1]?.day ?? "");

      const showHeader =
        showDivider ||
        !prev ||
        prev.sender.id !== message.sender.id ||
        new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS ||
        !!message.replyTo;

      acc.push({ message, showDivider, showHeader, day });
      return acc;
    },
    []
  );

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2">
      <div ref={topSentinelRef} />
      {loadingMore && <p className="py-2 text-center text-xs text-muted-foreground">Loading more…</p>}
      {rows.map(({ message, showDivider, showHeader, day }) => {
        return (
          <div key={message.id}>
            {showDivider && (
              <div className="my-4 flex items-center gap-3 px-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">{day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <MessageItem
              message={message}
              members={members}
              currentUserId={currentUserId}
              canModerate={canModerate}
              showHeader={showHeader}
              onReply={onReply}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
