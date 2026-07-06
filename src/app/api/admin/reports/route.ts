import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrganizer } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireOrganizer();
  if (error) return error;

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, name: true, image: true } },
      reportedUser: { select: { id: true, name: true, image: true } },
      message: {
        select: { id: true, content: true, conversationId: true, sender: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}

const schema = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]) });

export async function PATCH(req: NextRequest) {
  const { error } = await requireOrganizer();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.report.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
