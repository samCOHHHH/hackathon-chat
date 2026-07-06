"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socket = getSocket();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        socket.emit("presence:active");
      } else {
        socket.emit("presence:away");
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [socket]);

  return { socket, connected };
}
