import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import { prisma } from "./src/lib/prisma";
import { registerSocketServer } from "./src/lib/socket-emitter";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, { path: "/socket.io" });

  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        // @ts-expect-error -- socket.request is a raw IncomingMessage, compatible enough for cookie parsing
        req: socket.request,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
      });
      if (!token?.id) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.userId = token.id as string;
      socket.data.role = token.role as string;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;

    try {
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      memberships.forEach((m) => socket.join(`conversation:${m.conversationId}`));
      socket.join(`user:${userId}`);

      const activeSockets = await io.in(`user:${userId}`).fetchSockets();
      if (activeSockets.length === 1) {
        await prisma.user.update({
          where: { id: userId },
          data: { status: "ONLINE", lastSeen: new Date() },
        });
        io.emit("presence:update", { userId, status: "ONLINE" });
      }
    } catch (err) {
      console.error("socket connection setup failed", err);
    }

    socket.on("conversation:join", async (conversationId: string) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (membership) socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    socket.on("presence:away", async () => {
      await prisma.user.update({ where: { id: userId }, data: { status: "AWAY" } });
      io.emit("presence:update", { userId, status: "AWAY" });
    });

    socket.on("presence:active", async () => {
      await prisma.user.update({ where: { id: userId }, data: { status: "ONLINE", lastSeen: new Date() } });
      io.emit("presence:update", { userId, status: "ONLINE" });
    });

    socket.on("disconnect", async () => {
      try {
        const remaining = await io.in(`user:${userId}`).fetchSockets();
        if (remaining.length === 0) {
          const lastSeen = new Date();
          await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE", lastSeen } });
          io.emit("presence:update", { userId, status: "OFFLINE", lastSeen: lastSeen.toISOString() });
        }
      } catch (err) {
        console.error("socket disconnect handling failed", err);
      }
    });
  });

  registerSocketServer(io);

  httpServer.listen(port, () => {
    console.log(`> HackChat ready on http://${hostname}:${port}`);
  });
});
