import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  teamName: z.string().trim().max(80).nullable().optional(),
  image: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    teamName: updated.teamName,
    image: updated.image,
  });
}
