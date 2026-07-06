import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ people: [], groups: [], messages: [], files: [] });
  }

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.id },
    select: { conversationId: true },
  });
  const conversationIds = memberships.map((m) => m.conversationId);

  const [users, conversations, messages] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: user.id }, isBanned: false },
      select: { id: true, name: true, email: true, image: true, teamName: true },
    }),
    prisma.conversation.findMany({
      where: { id: { in: conversationIds }, type: "GROUP" },
      select: { id: true, name: true, image: true },
    }),
    prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        deletedAt: null,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const people = users
    .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .slice(0, 10);

  const groups = conversations.filter((c) => c.name?.toLowerCase().includes(q)).slice(0, 10);

  const matchedMessages = messages
    .filter((m) => m.content.toLowerCase().includes(q))
    .slice(0, 20)
    .map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      content: m.content,
      sender: m.sender,
      createdAt: m.createdAt.toISOString(),
    }));

  const files = messages
    .flatMap((m) =>
      m.attachments
        .filter((a) => a.name.toLowerCase().includes(q))
        .map((a) => ({ ...a, conversationId: m.conversationId, senderName: m.sender.name }))
    )
    .slice(0, 20);

  return NextResponse.json({ people, groups, messages: matchedMessages, files });
}
