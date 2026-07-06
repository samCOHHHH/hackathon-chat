export type PresenceStatus = "ONLINE" | "AWAY" | "OFFLINE";
export type ConversationType = "GENERAL" | "DIRECT" | "GROUP";

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  name: string;
  image: string | null;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
    status: PresenceStatus;
    lastSeen: string;
  } | null;
  memberCount: number;
  isAdmin: boolean;
  isMuted: boolean;
  isArchived: boolean;
  unreadCount: number;
  updatedAt: string;
  lastMessage: {
    content: string;
    type: string;
    senderName: string;
    createdAt: string;
  } | null;
};

export type ConversationMember = {
  userId: string;
  isAdmin: boolean;
  isMuted: boolean;
  isArchived: boolean;
  joinedAt: string;
  lastReadAt: string | null;
  user: {
    id: string;
    name: string;
    image: string | null;
    status: PresenceStatus;
    lastSeen: string;
    role: string;
    teamName: string | null;
  };
};

export type ConversationDetail = {
  id: string;
  type: ConversationType;
  name: string | null;
  image: string | null;
  createdById: string | null;
  members: ConversationMember[];
};

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  teamName: string | null;
  role: string;
  status: PresenceStatus;
  lastSeen: string;
  blockedByMe: boolean;
  blockingMe: boolean;
};

export type NotificationDTO = {
  id: string;
  userId: string;
  actorId: string | null;
  actor: { id: string; name: string; image: string | null } | null;
  type: "MENTION" | "REPLY" | "REACTION" | "INVITE" | "MESSAGE" | "ANNOUNCEMENT";
  conversationId: string | null;
  messageId: string | null;
  payload: string | null;
  isRead: boolean;
  createdAt: string;
};
