import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getIO, roomForConversation } from "@/lib/socket-emitter";

const schema = z.object({ isAdmin: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id, userId: targetUserId } = await params;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });
  if (!membership?.isAdmin) {
    return NextResponse.json({ error: "Only admins can change admin status" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId: targetUserId } },
    data: { isAdmin: parsed.data.isAdmin },
  });

  getIO()?.to(roomForConversation(id)).emit("conversation:members-changed", { id });

  return NextResponse.json({ ok: true });
}
