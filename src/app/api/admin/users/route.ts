import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizer } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireOrganizer();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      teamName: true,
      role: true,
      status: true,
      lastSeen: true,
      isBanned: true,
      bannedReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
