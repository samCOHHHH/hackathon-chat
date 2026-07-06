import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

const schema = z.object({ messageId: z.string().cuid(), pinned: z.boolean() });

export async function POST(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const message = await prisma.message.findUnique({ where: { id: parsed.data.messageId } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
  });
  const canPin = user.role === "ORGANIZER" || (membership?.isAdmin ?? false);
  if (!canPin) return NextResponse.json({ error: "Only admins can pin messages" }, { status: 403 });

  await prisma.message.update({
    where: { id: parsed.data.messageId },
    data: { isPinned: parsed.data.pinned },
  });

  getIO()
    ?.to(roomForConversation(message.conversationId))
    .emit("message:pinned", { messageId: message.id, conversationId: message.conversationId, pinned: parsed.data.pinned });

  return NextResponse.json({ ok: true });
}
