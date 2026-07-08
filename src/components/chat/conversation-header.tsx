"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hash, Users, Pin, MoreVertical, BellOff, Archive, Ban, Settings, Bell, ArchiveRestore } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PresenceDot } from "@/components/presence-dot";
import { apiPatch, apiPost } from "@/lib/fetcher";
import { formatLastSeen } from "@/lib/format-time";
import { GroupSettingsDialog } from "@/components/chat/group-settings-dialog";
import { PinnedMessagesDialog } from "@/components/chat/pinned-messages-dialog";
import { MembersListDialog } from "@/components/chat/members-list-dialog";
import { useConversations } from "@/hooks/use-conversations";
import type { ConversationSummary } from "@/types/chat";

export function ConversationHeader({
  conversation,
  currentUserId,
}: {
  conversation: ConversationSummary;
  currentUserId: string;
}) {
  const router = useRouter();
  const { mutate } = useConversations();
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  async function toggleMute() {
    await apiPatch(`/api/conversations/${conversation.id}/membership`, { isMuted: !conversation.isMuted });
    mutate();
  }

  async function toggleArchive() {
    await apiPatch(`/api/conversations/${conversation.id}/membership`, { isArchived: !conversation.isArchived });
    mutate();
    if (!conversation.isArchived) router.push("/");
  }

  async function toggleBlock() {
    if (!conversation.otherUser) return;
    try {
      await apiPost(`/api/users/${conversation.otherUser.id}/block`);
      toast.success("Updated block status");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  const subtitle =
    conversation.type === "GENERAL"
      ? "Everyone at the hackathon"
      : conversation.type === "GROUP"
        ? `${conversation.memberCount} members`
        : conversation.otherUser?.status === "ONLINE"
          ? "Online"
          : conversation.otherUser?.status === "AWAY"
            ? "Away"
            : conversation.otherUser
              ? formatLastSeen(conversation.otherUser.lastSeen)
              : "";

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          {conversation.type === "GENERAL" ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Hash className="h-5 w-5" />
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.image ?? undefined} />
              <AvatarFallback>
                {conversation.type === "GROUP" ? <Users className="h-4 w-4" /> : conversation.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
          {conversation.otherUser && <PresenceDot status={conversation.otherUser.status} />}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{conversation.name}</h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" title="Pinned messages" onClick={() => setPinnedOpen(true)}>
          <Pin className="h-4 w-4" />
        </Button>

        {conversation.type === "GENERAL" && (
          <Button variant="ghost" size="icon" title="View members" onClick={() => setMembersOpen(true)}>
            <Users className="h-4 w-4" />
          </Button>
        )}

        {conversation.type === "GROUP" && (
          <Button variant="ghost" size="icon" title="Group settings" onClick={() => setGroupSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleMute}>
              {conversation.isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {conversation.isMuted ? "Unmute" : "Mute"} conversation
            </DropdownMenuItem>
            {conversation.type !== "GENERAL" && (
              <DropdownMenuItem onClick={toggleArchive}>
                {conversation.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {conversation.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            )}
            {conversation.type === "DIRECT" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={toggleBlock}>
                  <Ban className="h-4 w-4" /> Block user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {conversation.type === "GROUP" && (
        <GroupSettingsDialog
          conversationId={conversation.id}
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
          currentUserId={currentUserId}
          onLeft={() => router.push("/")}
        />
      )}
      <PinnedMessagesDialog conversationId={conversation.id} open={pinnedOpen} onOpenChange={setPinnedOpen} />
      {conversation.type === "GENERAL" && (
        <MembersListDialog conversationId={conversation.id} open={membersOpen} onOpenChange={setMembersOpen} />
      )}
    </div>
  );
}
