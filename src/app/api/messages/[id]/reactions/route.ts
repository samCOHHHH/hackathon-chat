import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { reactionSchema } from "@/lib/validations";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { getIO, roomForConversation, roomForUser } from "@/lib/socket-emitter";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: messageId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse({ ...body, messageId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { emoji } = parsed.data;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { messageId, userId: user.id, emoji } });
    if (message.senderId !== user.id) {
      const notification = await prisma.notification.create({
        data: {
          userId: message.senderId,
          actorId: user.id,
          type: "REACTION",
          conversationId: message.conversationId,
          messageId,
          payload: emoji,
        },
      });
      getIO()?.to(roomForUser(message.senderId)).emit("notification:new", notification);
    }
  }

  const updated = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    include: messageInclude,
  });
  const dto = toMessageDTO(updated, user.id);
  getIO()?.to(roomForConversation(message.conversationId)).emit("message:updated", dto);

  return NextResponse.json(dto);
}
