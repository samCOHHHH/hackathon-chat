import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: messageId } = await params;

  const existing = await prisma.starredMessage.findUnique({
    where: { userId_messageId: { userId: user.id, messageId } },
  });

  if (existing) {
    await prisma.starredMessage.delete({ where: { id: existing.id } });
    return NextResponse.json({ starred: false });
  }

  await prisma.starredMessage.create({ data: { userId: user.id, messageId } });
  return NextResponse.json({ starred: true });
}
