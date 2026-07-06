import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({
  reason: z.string().trim().min(3).max(500),
  messageId: z.string().cuid().optional(),
  reportedUserId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  const { error, user } = await requireUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  if (!parsed.data.messageId && !parsed.data.reportedUserId) {
    return NextResponse.json({ error: "Must report a message or a user" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: user.id,
      reason: parsed.data.reason,
      messageId: parsed.data.messageId,
      reportedUserId: parsed.data.reportedUserId,
    },
  });

  return NextResponse.json({ id: report.id }, { status: 201 });
}
