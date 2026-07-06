import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { messageInclude, toMessageDTO } from "@/lib/message-dto";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: conversationId } = await params;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const now = new Date();

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }, { senderId: user.id }],
    },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = messages.slice(0, PAGE_SIZE).reverse();

  return NextResponse.json({
    messages: page.map((m) => toMessageDTO(m, user.id)),
    nextCursor: hasMore ? messages[PAGE_SIZE - 1].id : null,
  });
}
