"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { useSocket } from "@/hooks/use-socket";
import type { MessageDTO } from "@/lib/message-dto";

type MessagesPage = { messages: MessageDTO[]; nextCursor: string | null };

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const { socket } = useSocket();

  const load = useCallback(async (id: string, cursor: string | null) => {
    const url = cursor
      ? `/api/conversations/${id}/messages?cursor=${cursor}`
      : `/api/conversations/${id}/messages`;
    return fetcher<MessagesPage>(url);
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    cursorRef.current = null;

    load(conversationId, null).then((page) => {
      if (cancelled) return;
      setMessages(page.messages);
      cursorRef.current = page.messages[0]?.id ?? null;
      setHasMore(!!page.nextCursor);
      cursorRef.current = page.nextCursor;
      setLoading(false);
    });

    socket.emit("conversation:join", conversationId);

    return () => {
      cancelled = true;
    };
  }, [conversationId, load, socket]);

  useEffect(() => {
    if (!conversationId) return;

    function onNew(message: MessageDTO) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
    function onUpdated(message: MessageDTO) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    }
    function onDeleted({ id, conversationId: cid }: { id: string; conversationId: string }) {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: "", deletedAt: new Date().toISOString() } : m))
      );
    }
    function onPinned({
      messageId,
      conversationId: cid,
      pinned,
    }: {
      messageId: string;
      conversationId: string;
      pinned: boolean;
    }) {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isPinned: pinned } : m)));
    }

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("message:pinned", onPinned);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("message:pinned", onPinned);
    };
  }, [conversationId, socket]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !cursorRef.current || loadingMore) return;
    setLoadingMore(true);
    const page = await load(conversationId, cursorRef.current);
    setMessages((prev) => [...page.messages, ...prev]);
    cursorRef.current = page.nextCursor;
    setHasMore(!!page.nextCursor);
    setLoadingMore(false);
  }, [conversationId, load, loadingMore]);

  return { messages, setMessages, loading, loadingMore, hasMore, loadMore };
}
