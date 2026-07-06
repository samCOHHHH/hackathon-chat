import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const general = await prisma.conversation.findFirst({ where: { type: "GENERAL" } });
  if (general) redirect(`/chat/${general.id}`);

  redirect("/chat/none");
}
