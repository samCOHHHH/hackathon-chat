import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { pollCreateSchema } from "@/lib/validations";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

export async function POST(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = pollCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { conversationId, question, options, allowMultiple } = parsed.data;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: user.id,
      content: question,
      type: "POLL",
      sentAt: new Date(),
      poll: {
        create: {
          question,
          allowMultiple,
          options: { create: options.map((text) => ({ text })) },
        },
      },
    },
    include: messageInclude,
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const dto = toMessageDTO(message, user.id);
  getIO()?.to(roomForConversation(conversationId)).emit("message:new", dto);

  return NextResponse.json(dto, { status: 201 });
}
