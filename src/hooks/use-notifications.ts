"use client";

import useSWR from "swr";
import { useEffect } from "react";
import { fetcher, apiPatch } from "@/lib/fetcher";
import { useSocket } from "@/hooks/use-socket";
import type { NotificationDTO } from "@/types/chat";

export function useNotifications() {
  const { data, mutate } = useSWR<NotificationDTO[]>("/api/notifications", fetcher, {
    refreshInterval: 60_000,
  });
  const { socket } = useSocket();

  useEffect(() => {
    const refresh = () => mutate();
    socket.on("notification:new", refresh);
    return () => {
      socket.off("notification:new", refresh);
    };
  }, [socket, mutate]);

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markAllRead() {
    await apiPatch("/api/notifications", { markAll: true });
    mutate();
  }

  return { notifications, unreadCount, markAllRead, mutate };
}
