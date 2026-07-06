"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Hash, Users, Plus, Search, ShieldCheck, MessageSquareCode } from "lucide-react";
import { useSession } from "next-auth/react";
import { useConversations } from "@/hooks/use-conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/presence-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatConversationTimestamp } from "@/lib/format-time";
import { UserMenu } from "@/components/chat/user-menu";
import { NotificationBell } from "@/components/chat/notification-bell";
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog";
import { GlobalSearchDialog } from "@/components/chat/global-search-dialog";

export function Sidebar() {
  const { data: session } = useSession();
  const { conversations, isLoading } = useConversations();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const visible = useMemo(() => conversations.filter((c) => !c.isArchived), [conversations]);

  const general = visible.filter((c) => c.type === "GENERAL");
  const directs = visible.filter((c) => c.type === "DIRECT");
  const groups = visible.filter((c) => c.type === "GROUP");

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MessageSquareCode className="h-4 w-4" />
          </div>
          HackChat
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          {session?.user?.role === "ORGANIZER" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Admin dashboard"
              nativeButton={false}
              render={
                <Link href="/admin">
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              }
            />
          )}
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading && (
          <div className="space-y-2 px-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-sidebar-accent/40" />
            ))}
          </div>
        )}

        {general.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={activeId === c.id} />
        ))}

        <SectionHeader label="Direct messages" onAdd={() => setNewConvoOpen(true)} />
        {directs.length === 0 && (
          <p className="px-3 pb-2 text-xs text-muted-foreground">No conversations yet</p>
        )}
        {directs.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={activeId === c.id} />
        ))}

        <SectionHeader label="Groups" icon={<Users className="h-3.5 w-3.5" />} onAdd={() => setNewConvoOpen(true)} />
        {groups.length === 0 && <p className="px-3 pb-2 text-xs text-muted-foreground">No groups yet</p>}
        {groups.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={activeId === c.id} />
        ))}
      </div>

      <UserMenu />

      <NewConversationDialog open={newConvoOpen} onOpenChange={setNewConvoOpen} />
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </aside>
  );
}

function SectionHeader({
  label,
  icon,
  onAdd,
}: {
  label: string;
  icon?: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between px-3 py-1">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <button
        onClick={onAdd}
        className="rounded p-0.5 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
}: {
  conversation: ReturnType<typeof useConversations>["conversations"][number];
  active: boolean;
}) {
  const isGeneral = conversation.type === "GENERAL";
  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={cn(
        "group mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
      )}
    >
      <div className="relative shrink-0">
        {isGeneral ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Hash className="h-4 w-4" />
          </div>
        ) : conversation.type === "GROUP" ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={conversation.image ?? undefined} />
            <AvatarFallback>
              <Users className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-9 w-9">
            <AvatarImage src={conversation.image ?? undefined} />
            <AvatarFallback>{conversation.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
        )}
        {conversation.otherUser && <PresenceDot status={conversation.otherUser.status} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate font-medium", conversation.unreadCount > 0 && "font-semibold")}>
            {conversation.name}
          </span>
          {conversation.lastMessage && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatConversationTimestamp(conversation.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessage
              ? `${conversation.lastMessage.senderName === conversation.name ? "" : conversation.lastMessage.senderName + ": "}${previewText(conversation.lastMessage)}`
              : "No messages yet"}
          </span>
          {conversation.unreadCount > 0 && (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Badge>
          )}
          {conversation.isMuted && (
            <span className="text-[10px] text-muted-foreground">muted</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function previewText(lastMessage: { content: string; type: string }) {
  switch (lastMessage.type) {
    case "IMAGE":
      return "📷 Photo";
    case "GIF":
      return "GIF";
    case "FILE":
      return "📎 File";
    case "VOICE":
      return "🎤 Voice message";
    case "POLL":
      return "📊 Poll";
    case "ANNOUNCEMENT":
      return `📣 ${lastMessage.content}`;
    default:
      return lastMessage.content || "…";
  }
}
