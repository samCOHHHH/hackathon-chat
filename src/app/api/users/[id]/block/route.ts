import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser();
  if (error) return error;
  const { id: blockedId } = await params;

  if (blockedId === user.id) {
    return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });
  }

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
  });

  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    return NextResponse.json({ blocked: false });
  }

  await prisma.block.create({ data: { blockerId: user.id, blockedId } });
  return NextResponse.json({ blocked: true });
}
