import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { conversationCreateSchema } from "@/lib/validations";
import { getIO, roomForUser } from "@/lib/socket-emitter";

export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, image: true, status: true, lastSeen: true },
              },
            },
          },
          messages: {
            where: { deletedAt: null, OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }] },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { name: true } } },
          },
        },
      },
    },
  });

  const results = await Promise.all(
    memberships.map(async (m) => {
      const conversation = m.conversation;
      const lastMessage = conversation.messages[0] ?? null;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: user.id },
          deletedAt: null,
          createdAt: m.lastReadAt ? { gt: m.lastReadAt } : undefined,
          OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
        },
      });

      const otherMembers = conversation.members.filter((mem) => mem.userId !== user.id);
      const otherUser = conversation.type === "DIRECT" ? otherMembers[0]?.user ?? null : null;

      return {
        id: conversation.id,
        type: conversation.type,
        name:
          conversation.type === "DIRECT"
            ? otherUser?.name ?? "Unknown"
            : conversation.type === "GENERAL"
              ? "General"
              : (conversation.name ?? "Unnamed group"),
        image: conversation.type === "DIRECT" ? (otherUser?.image ?? null) : conversation.image,
        otherUser,
        memberCount: conversation.members.length,
        isAdmin: m.isAdmin,
        isMuted: m.isMuted,
        isArchived: m.isArchived,
        unreadCount,
        updatedAt: conversation.updatedAt.toISOString(),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              type: lastMessage.type,
              senderName: lastMessage.sender.name,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    })
  );

  results.sort((a, b) => {
    if (a.type === "GENERAL") return -1;
    if (b.type === "GENERAL") return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = conversationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { type, memberIds, name } = parsed.data;

  if (type === "DIRECT") {
    if (memberIds.length !== 1) {
      return NextResponse.json({ error: "Direct conversations need exactly one other member" }, { status: 400 });
    }
    const otherId = memberIds[0];
    if (otherId === user.id) {
      return NextResponse.json({ error: "Cannot start a conversation with yourself" }, { status: 400 });
    }

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: otherId },
          { blockerId: otherId, blockedId: user.id },
        ],
      },
    });
    if (blocked) {
      return NextResponse.json({ error: "You can't message this user" }, { status: 403 });
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: otherId } } },
        ],
      },
    });
    if (existing) return NextResponse.json({ id: existing.id, existed: true });

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: user.id,
        members: { create: [{ userId: user.id }, { userId: otherId }] },
      },
    });

    getIO()?.to(roomForUser(otherId)).emit("conversation:new", { id: conversation.id });
    return NextResponse.json({ id: conversation.id, existed: false }, { status: 201 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: name?.trim() || "New group",
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, isAdmin: true },
          ...memberIds.filter((id) => id !== user.id).map((userId) => ({ userId })),
        ],
      },
    },
  });

  for (const memberId of memberIds) {
    if (memberId === user.id) continue;
    getIO()?.to(roomForUser(memberId)).emit("conversation:new", { id: conversation.id });
    await prisma.notification.create({
      data: { userId: memberId, actorId: user.id, type: "INVITE", conversationId: conversation.id },
    });
  }

  return NextResponse.json({ id: conversation.id, existed: false }, { status: 201 });
}
