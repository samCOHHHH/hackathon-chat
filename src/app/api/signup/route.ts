import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const { success } = rateLimit(`signup:${ip}`, RATE_LIMITS.auth);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, email, password, teamName, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      teamName: teamName || null,
      role,
      image: body.image || null,
    },
  });

  let general = await prisma.conversation.findFirst({ where: { type: "GENERAL" } });
  if (!general) {
    general = await prisma.conversation.create({ data: { type: "GENERAL", name: "General" } });
  }
  await prisma.conversationMember.create({
    data: { conversationId: general.id, userId: user.id },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
