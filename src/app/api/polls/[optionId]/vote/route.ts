import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ optionId: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { optionId } = await params;

  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    include: { poll: { include: { message: true } } },
  });
  if (!option) return NextResponse.json({ error: "Option not found" }, { status: 404 });

  const existing = await prisma.pollVote.findUnique({
    where: { pollOptionId_userId: { pollOptionId: optionId, userId: user.id } },
  });

  if (existing) {
    await prisma.pollVote.delete({ where: { id: existing.id } });
  } else {
    if (!option.poll.allowMultiple) {
      await prisma.pollVote.deleteMany({
        where: { userId: user.id, pollOption: { pollId: option.pollId } },
      });
    }
    await prisma.pollVote.create({ data: { pollOptionId: optionId, userId: user.id } });
  }

  const message = await prisma.message.findUniqueOrThrow({
    where: { id: option.poll.messageId },
    include: messageInclude,
  });
  const dto = toMessageDTO(message, user.id);
  getIO()?.to(roomForConversation(option.poll.message.conversationId)).emit("message:updated", dto);

  return NextResponse.json(dto);
}
