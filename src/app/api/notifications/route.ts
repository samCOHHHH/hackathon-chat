import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await requireUser();
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { actor: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

const schema = z.object({ ids: z.array(z.string().cuid()).optional(), markAll: z.boolean().optional() });

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      ...(parsed.data.markAll ? {} : { id: { in: parsed.data.ids ?? [] } }),
    },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
