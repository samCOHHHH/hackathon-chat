import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const { success } = rateLimit(`login:${email}`, RATE_LIMITS.auth);
        if (!success) throw new Error("TOO_MANY_ATTEMPTS");

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.isBanned) throw new Error("BANNED");

        await prisma.user.update({
          where: { id: user.id },
          data: { status: "ONLINE", lastSeen: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          teamName: user.teamName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "PARTICIPANT";
        token.teamName = (user as { teamName?: string | null }).teamName ?? null;
      }
      if (trigger === "update" && session) {
        const patch = session as Partial<{ name: string; image: string | null; teamName: string | null }>;
        if (patch.name !== undefined) token.name = patch.name;
        if (patch.image !== undefined) token.picture = patch.image;
        if (patch.teamName !== undefined) token.teamName = patch.teamName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.teamName = (token.teamName as string | null) ?? null;
      }
      return session;
    },
  },
});
