import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrganizer } from "@/lib/api-auth";
import { sanitizePlainText } from "@/lib/sanitize";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { getIO, roomForConversation, roomForUser } from "@/lib/socket-emitter";

const schema = z.object({ content: z.string().trim().min(1).max(2000) });

export async function POST(req: NextRequest) {
  const { error, user } = await requireOrganizer();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const general = await prisma.conversation.findFirst({ where: { type: "GENERAL" } });
  if (!general) return NextResponse.json({ error: "General conversation missing" }, { status: 500 });

  const message = await prisma.message.create({
    data: {
      conversationId: general.id,
      senderId: user.id,
      content: sanitizePlainText(parsed.data.content),
      type: "ANNOUNCEMENT",
      sentAt: new Date(),
    },
    include: messageInclude,
  });

  const dto = toMessageDTO(message, user.id);
  const io = getIO();
  io?.to(roomForConversation(general.id)).emit("message:new", dto);

  const allUsers = await prisma.user.findMany({ where: { id: { not: user.id } }, select: { id: true } });
  await prisma.notification.createMany({
    data: allUsers.map((u) => ({
      userId: u.id,
      actorId: user.id,
      type: "ANNOUNCEMENT" as const,
      conversationId: general.id,
      messageId: message.id,
    })),
  });
  for (const u of allUsers) {
    io?.to(roomForUser(u.id)).emit("notification:new", { type: "ANNOUNCEMENT", conversationId: general.id });
  }

  return NextResponse.json(dto, { status: 201 });
}
