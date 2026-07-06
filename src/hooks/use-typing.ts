"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

export function useTypingIndicator(conversationId: string | null) {
  const { socket } = useSocket();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    function onStart({ conversationId: cid, userId }: { conversationId: string; userId: string }) {
      if (cid !== conversationId) return;
      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      const existing = timers.current.get(userId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        userId,
        setTimeout(() => {
          setTypingUserIds((prev) => prev.filter((id) => id !== userId));
        }, 4000)
      );
    }
    function onStop({ conversationId: cid, userId }: { conversationId: string; userId: string }) {
      if (cid !== conversationId) return;
      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    }

    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);
    const timersAtMount = timers.current;
    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
      timersAtMount.forEach(clearTimeout);
      timersAtMount.clear();
      setTypingUserIds([]);
    };
  }, [conversationId, socket]);

  function notifyTyping() {
    if (conversationId) socket.emit("typing:start", { conversationId });
  }
  function notifyStopTyping() {
    if (conversationId) socket.emit("typing:stop", { conversationId });
  }

  return { typingUserIds, notifyTyping, notifyStopTyping };
}
