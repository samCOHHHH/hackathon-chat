import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrganizer } from "@/lib/api-auth";
import { roleEnum } from "@/lib/validations";
import { isSuperAdmin } from "@/lib/permissions";
import { getIO, roomForUser } from "@/lib/socket-emitter";

const schema = z.object({
  isBanned: z.boolean().optional(),
  bannedReason: z.string().max(300).optional(),
  role: roleEnum.optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: actor } = await requireOrganizer();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.role !== undefined && !isSuperAdmin(actor.email)) {
    return NextResponse.json({ error: "Only the super admin can change roles" }, { status: 403 });
  }

  const user = await prisma.user.update({ where: { id }, data: parsed.data });

  if (parsed.data.isBanned) {
    getIO()?.to(roomForUser(id)).emit("account:banned", { reason: parsed.data.bannedReason ?? null });
  }

  return NextResponse.json({ id: user.id, isBanned: user.isBanned, role: user.role });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: admin } = await requireOrganizer();
  if (error) return error;
  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  getIO()?.to(roomForUser(id)).emit("account:removed");

  return NextResponse.json({ ok: true });
}
