"use client";

import { use, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useConversations } from "@/hooks/use-conversations";
import { useMessages } from "@/hooks/use-messages";
import { useTypingIndicator } from "@/hooks/use-typing";
import { ConversationHeader } from "@/components/chat/conversation-header";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { fetcher } from "@/lib/fetcher";
import type { ConversationDetail } from "@/types/chat";
import type { MessageDTO } from "@/lib/message-dto";
import { Loader2 } from "lucide-react";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const { data: session } = useSession();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, loading, loadingMore, hasMore, loadMore } = useMessages(conversationId);
  const { typingUserIds } = useTypingIndicator(conversationId);
  const [replyTo, setReplyTo] = useState<MessageDTO | null>(null);

  const { data: detail } = useSWR<ConversationDetail>(`/api/conversations/${conversationId}`, fetcher);

  const conversation = conversations.find((c) => c.id === conversationId);

  if (!session?.user) return null;

  if (conversationsLoading && !conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Conversation not found — it may have been removed.
      </div>
    );
  }

  const members = (detail?.members ?? []).map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }));

  const typingNames = typingUserIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter((n): n is string => !!n);

  const canModerate =
    session.user.role === "ORGANIZER" || conversations.find((c) => c.id === conversationId)?.isAdmin === true;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ConversationHeader conversation={conversation} currentUserId={session.user.id} />
      <MessageList
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        members={members}
        currentUserId={session.user.id}
        canModerate={canModerate}
        onReply={setReplyTo}
        emptyLabel={
          conversation.type === "GENERAL"
            ? "Welcome to #General — say hi to everyone!"
            : "No messages yet — start the conversation"
        }
      />
      <TypingIndicator names={typingNames} />
      <Composer
        conversationId={conversationId}
        members={members}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
