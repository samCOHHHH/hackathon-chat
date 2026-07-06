"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { fetcher } from "@/lib/fetcher";
import { useSocket } from "@/hooks/use-socket";
import type { ConversationSummary } from "@/types/chat";

export function useConversations() {
  const { data, error, isLoading, mutate } = useSWR<ConversationSummary[]>(
    "/api/conversations",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { socket } = useSocket();

  useEffect(() => {
    const refresh = () => mutate();
    socket.on("message:new", refresh);
    socket.on("conversation:new", refresh);
    socket.on("conversation:updated", refresh);
    socket.on("conversation:members-changed", refresh);
    socket.on("conversation:removed", refresh);
    socket.on("presence:update", refresh);
    return () => {
      socket.off("message:new", refresh);
      socket.off("conversation:new", refresh);
      socket.off("conversation:updated", refresh);
      socket.off("conversation:members-changed", refresh);
      socket.off("conversation:removed", refresh);
      socket.off("presence:update", refresh);
    };
  }, [socket, mutate]);

  return { conversations: data ?? [], error, isLoading, mutate };
}
