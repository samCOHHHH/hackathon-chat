import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { messageEditSchema } from "@/lib/validations";
import { sanitizePlainText } from "@/lib/sanitize";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: messageId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = messageEditSchema.safeParse({ ...body, messageId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (existing.senderId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
  }

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { content: sanitizePlainText(parsed.data.content), editedAt: new Date() },
    include: messageInclude,
  });

  const dto = toMessageDTO(message, user.id);
  getIO()?.to(roomForConversation(message.conversationId)).emit("message:updated", dto);

  return NextResponse.json(dto);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: messageId } = await params;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: existing.conversationId, userId: user.id } },
  });

  const canDelete =
    existing.senderId === user.id ||
    user.role === "ORGANIZER" ||
    (membership?.isAdmin ?? false);

  if (!canDelete) {
    return NextResponse.json({ error: "You can't delete this message" }, { status: 403 });
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { content: "", deletedAt: new Date() },
  });

  getIO()
    ?.to(roomForConversation(existing.conversationId))
    .emit("message:deleted", { id: messageId, conversationId: existing.conversationId });

  return NextResponse.json({ ok: true });
}
