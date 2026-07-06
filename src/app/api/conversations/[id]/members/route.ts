import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getIO, roomForConversation, roomForUser } from "@/lib/socket-emitter";

const addSchema = z.object({ memberIds: z.array(z.string().cuid()).min(1).max(100) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || conversation.type !== "GROUP") {
    return NextResponse.json({ error: "Not a group" }, { status: 400 });
  }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existingMembers = await prisma.conversationMember.findMany({
    where: { conversationId: id, userId: { in: parsed.data.memberIds } },
    select: { userId: true },
  });
  const existingIds = new Set(existingMembers.map((m) => m.userId));
  const newIds = parsed.data.memberIds.filter((mid) => !existingIds.has(mid));

  await prisma.conversationMember.createMany({
    data: newIds.map((userId) => ({ conversationId: id, userId })),
  });

  for (const memberId of newIds) {
    getIO()?.to(roomForUser(memberId)).emit("conversation:new", { id });
    await prisma.notification.create({
      data: { userId: memberId, actorId: user.id, type: "INVITE", conversationId: id },
    });
  }

  getIO()?.to(roomForConversation(id)).emit("conversation:members-changed", { id });

  return NextResponse.json({ added: newIds.length });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const targetUserId = req.nextUrl.searchParams.get("userId") ?? user.id;
  const isSelf = targetUserId === user.id;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  if (!isSelf && !membership.isAdmin) {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }

  await prisma.conversationMember.delete({
    where: { conversationId_userId: { conversationId: id, userId: targetUserId } },
  });

  getIO()?.to(roomForConversation(id)).emit("conversation:members-changed", { id });
  if (!isSelf) getIO()?.to(roomForUser(targetUserId)).emit("conversation:removed", { id });

  return NextResponse.json({ ok: true });
}
