import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const allUsers = await prisma.user.findMany({
    where: { id: { not: user.id }, isBanned: false },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      teamName: true,
      role: true,
      status: true,
      lastSeen: true,
    },
    orderBy: { name: "asc" },
  });

  // SQLite has no case-insensitive `contains`; filtering in-memory is fine at hackathon scale.
  const users = (
    q
      ? allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.teamName?.toLowerCase().includes(q)
        )
      : allUsers
  ).slice(0, 50);

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
  });
  const blockedByMe = new Set(blocks.filter((b) => b.blockerId === user.id).map((b) => b.blockedId));
  const blockingMe = new Set(blocks.filter((b) => b.blockedId === user.id).map((b) => b.blockerId));

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      blockedByMe: blockedByMe.has(u.id),
      blockingMe: blockingMe.has(u.id),
    }))
  );
}
