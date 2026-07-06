import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: conversationId } = await params;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { conversationId, isPinned: true, deletedAt: null },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(messages.map((m) => toMessageDTO(m, user.id)));
}
