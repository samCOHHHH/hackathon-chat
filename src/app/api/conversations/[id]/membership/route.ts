import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
