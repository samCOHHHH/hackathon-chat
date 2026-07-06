import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { groupUpdateSchema } from "@/lib/validations";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, image: true, status: true, lastSeen: true, role: true, teamName: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    image: conversation.image,
    createdById: conversation.createdById,
    members: conversation.members.map((m) => ({
      userId: m.userId,
      isAdmin: m.isAdmin,
      isMuted: m.isMuted,
      isArchived: m.isArchived,
      joinedAt: m.joinedAt.toISOString(),
      lastReadAt: m.lastReadAt?.toISOString() ?? null,
      user: m.user,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = groupUpdateSchema.safeParse({ ...body, conversationId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership?.isAdmin) {
    return NextResponse.json({ error: "Only group admins can update the group" }, { status: 403 });
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.image !== undefined ? { image: parsed.data.image } : {}),
    },
  });

  getIO()?.to(roomForConversation(id)).emit("conversation:updated", {
    id: conversation.id,
    name: conversation.name,
    image: conversation.image,
  });

  return NextResponse.json({ ok: true });
}
