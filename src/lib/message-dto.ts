import { Prisma } from "@prisma/client";

export const messageInclude = {
  sender: {
    select: { id: true, name: true, image: true, role: true, teamName: true },
  },
  attachments: true,
  reactions: {
    include: { user: { select: { id: true, name: true } } },
  },
  mentions: { select: { userId: true } },
  poll: {
    include: {
      options: {
        include: { votes: { select: { userId: true } } },
      },
    },
  },
  replyTo: {
    include: {
      sender: { select: { id: true, name: true } },
    },
  },
  starredBy: { select: { userId: true } },
} satisfies Prisma.MessageInclude;

export type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export function toMessageDTO(message: MessageWithRelations, viewerId: string) {
  const reactionGroups = new Map<string, { emoji: string; userIds: string[]; names: string[] }>();
  for (const r of message.reactions) {
    const group = reactionGroups.get(r.emoji) ?? { emoji: r.emoji, userIds: [], names: [] };
    group.userIds.push(r.userId);
    group.names.push(r.user.name);
    reactionGroups.set(r.emoji, group);
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.deletedAt ? "" : message.content,
    type: message.type,
    sender: message.sender,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
    deletedAt: message.deletedAt?.toISOString() ?? null,
    isPinned: message.isPinned,
    scheduledFor: message.scheduledFor?.toISOString() ?? null,
    attachments: message.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      name: a.name,
      size: a.size,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
    })),
    reactions: Array.from(reactionGroups.values()),
    mentionedUserIds: message.mentions.map((m) => m.userId),
    isStarred: message.starredBy.some((s) => s.userId === viewerId),
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.deletedAt ? "Message deleted" : message.replyTo.content,
          senderName: message.replyTo.sender.name,
        }
      : null,
    poll: message.poll
      ? {
          id: message.poll.id,
          question: message.poll.question,
          allowMultiple: message.poll.allowMultiple,
          closesAt: message.poll.closesAt?.toISOString() ?? null,
          options: message.poll.options.map((o) => ({
            id: o.id,
            text: o.text,
            voteCount: o.votes.length,
            votedByMe: o.votes.some((v) => v.userId === viewerId),
          })),
        }
      : null,
  };
}

export type MessageDTO = ReturnType<typeof toMessageDTO>;
