import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: messageId } = await params;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await prisma.readReceipt.upsert({
    where: { messageId_userId: { messageId, userId: user.id } },
    update: { readAt: new Date() },
    create: { messageId, userId: user.id },
  });

  await prisma.conversationMember.updateMany({
    where: { conversationId: message.conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  });

  getIO()
    ?.to(roomForConversation(message.conversationId))
    .emit("message:read", { messageId, userId: user.id, conversationId: message.conversationId });

  return NextResponse.json({ ok: true });
}
