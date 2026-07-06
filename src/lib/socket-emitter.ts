import type { Server as IOServer } from "socket.io";

const globalForIO = globalThis as unknown as { io?: IOServer };

export function registerSocketServer(io: IOServer) {
  globalForIO.io = io;
}

/** Only available inside the custom Node server process (server.ts), not on Vercel's serverless functions. */
export function getIO(): IOServer | undefined {
  return globalForIO.io;
}

export function roomForConversation(conversationId: string) {
  return `conversation:${conversationId}`;
}

export function roomForUser(userId: string) {
  return `user:${userId}`;
}
