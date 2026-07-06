import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const general = await prisma.conversation.findFirst({ where: { type: "GENERAL" } });
  if (!general) {
    await prisma.conversation.create({
      data: { type: "GENERAL", name: "General" },
    });
    console.log("Created #general conversation");
  }

  const organizerEmail = "organizer@hackathon.dev";
  const existing = await prisma.user.findUnique({ where: { email: organizerEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("organizer123", 12);
    const organizer = await prisma.user.create({
      data: {
        name: "Hackathon Organizer",
        email: organizerEmail,
        passwordHash,
        role: "ORGANIZER",
        teamName: "Organizers",
      },
    });
    const generalConvo = await prisma.conversation.findFirst({ where: { type: "GENERAL" } });
    if (generalConvo) {
      await prisma.conversationMember.create({
        data: { conversationId: generalConvo.id, userId: organizer.id, isAdmin: true },
      });
    }
    console.log(`Created organizer account: ${organizerEmail} / organizer123`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
