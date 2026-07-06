import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { messageCreateSchema } from "@/lib/validations";
import { sanitizePlainText } from "@/lib/sanitize";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getIO, roomForConversation, roomForUser } from "@/lib/socket-emitter";

export async function POST(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const { success } = rateLimit(`message:${user.id}`, RATE_LIMITS.message);
  if (!success) {
    return NextResponse.json({ error: "You're sending messages too fast" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = messageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: data.conversationId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: data.conversationId },
    include: { members: { select: { userId: true } } },
  });
  if (conversation?.type === "DIRECT") {
    const otherId = conversation.members.find((m) => m.userId !== user.id)?.userId;
    if (otherId) {
      const blocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: user.id, blockedId: otherId },
            { blockerId: otherId, blockedId: user.id },
          ],
        },
      });
      if (blocked) return NextResponse.json({ error: "You can't message this user" }, { status: 403 });
    }
  }

  if (data.content.length === 0 && !data.attachments?.length) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const cleanContent = sanitizePlainText(data.content);
  const isScheduled = data.scheduledFor && data.scheduledFor.getTime() > Date.now();

  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      senderId: user.id,
      content: cleanContent,
      type: data.type,
      replyToId: data.replyToId ?? null,
      scheduledFor: isScheduled ? data.scheduledFor : null,
      sentAt: isScheduled ? null : new Date(),
      attachments: data.attachments?.length
        ? { create: data.attachments }
        : undefined,
      mentions: data.mentionUserIds?.length
        ? { create: data.mentionUserIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: messageInclude,
  });

  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  });

  const dto = toMessageDTO(message, user.id);
  const io = getIO();

  if (!isScheduled) {
    io?.to(roomForConversation(data.conversationId)).emit("message:new", dto);

    if (data.mentionUserIds?.length) {
      for (const mentionedId of data.mentionUserIds) {
        if (mentionedId === user.id) continue;
        const notification = await prisma.notification.create({
          data: {
            userId: mentionedId,
            actorId: user.id,
            type: "MENTION",
            conversationId: data.conversationId,
            messageId: message.id,
          },
        });
        io?.to(roomForUser(mentionedId)).emit("notification:new", notification);
      }
    }

    if (data.replyToId) {
      const original = await prisma.message.findUnique({ where: { id: data.replyToId } });
      if (original && original.senderId !== user.id) {
        const notification = await prisma.notification.create({
          data: {
            userId: original.senderId,
            actorId: user.id,
            type: "REPLY",
            conversationId: data.conversationId,
            messageId: message.id,
          },
        });
        io?.to(roomForUser(original.senderId)).emit("notification:new", notification);
      }
    }
  }

  return NextResponse.json(dto, { status: 201 });
}
