"use client";

import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Reply,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Star,
  MoreHorizontal,
  SmilePlus,
  Megaphone,
} from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MentionText } from "@/components/chat/mention-text";
import { AttachmentGrid } from "@/components/chat/attachment-grid";
import { PollWidget } from "@/components/chat/poll-widget";
import { ReactionBar } from "@/components/chat/reaction-bar";
import { formatMessageTimestamp } from "@/lib/format-time";
import { apiPatch, apiDelete, apiPost } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { MessageDTO } from "@/lib/message-dto";

export function MessageItem({
  message,
  members,
  currentUserId,
  canModerate,
  showHeader,
  onReply,
}: {
  message: MessageDTO;
  members: { id: string; name: string }[];
  currentUserId: string;
  canModerate: boolean;
  showHeader: boolean;
  onReply: (message: MessageDTO) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  const isMine = message.sender.id === currentUserId;
  const isDeleted = !!message.deletedAt;
  const isAnnouncement = message.type === "ANNOUNCEMENT";
  const canEdit = isMine && !isDeleted;
  const canDelete = (isMine || canModerate) && !isDeleted;

  async function saveEdit() {
    if (!draft.trim()) return;
    try {
      await apiPatch(`/api/messages/${message.id}`, { content: draft });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit message");
    }
  }

  async function handleDelete() {
    try {
      await apiDelete(`/api/messages/${message.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    }
  }

  async function togglePin() {
    try {
      await apiPost("/api/admin/pin", { messageId: message.id, pinned: !message.isPinned });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pin message");
    }
  }

  async function toggleStar() {
    await apiPost(`/api/messages/${message.id}/star`);
  }

  async function reactWith(emoji: string) {
    await apiPost(`/api/messages/${message.id}/reactions`, { emoji });
    setReactionPickerOpen(false);
  }

  async function reportMessage() {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason) return;
    try {
      await apiPost("/api/reports", { messageId: message.id, reason });
      toast.success("Report submitted to organizers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group relative flex gap-3 rounded-lg px-3 py-1 hover:bg-accent/30",
        showHeader ? "mt-3" : "mt-0.5",
        isAnnouncement && "border border-primary/30 bg-primary/5 py-2"
      )}
    >
      <div className="w-9 shrink-0">
        {showHeader && (
          <Avatar className="h-9 w-9">
            <AvatarImage src={message.sender.image ?? undefined} />
            <AvatarFallback>{message.sender.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{message.sender.name}</span>
            {isAnnouncement && (
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <Megaphone className="h-3 w-3" /> Announcement
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {formatMessageTimestamp(message.createdAt)}
            </span>
            {message.isPinned && <Pin className="h-3 w-3 text-primary" />}
          </div>
        )}

        {message.replyTo && (
          <div className="mb-1 flex items-center gap-1.5 rounded border-l-2 border-primary/50 bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            <Reply className="h-3 w-3 shrink-0" />
            <span className="font-medium">{message.replyTo.senderName}:</span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">Message deleted</p>
        ) : editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-16 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <MentionText content={message.content} members={members} />
            <AttachmentGrid attachments={message.attachments} messageType={message.type} />
            {message.poll && <PollWidget poll={message.poll} />}
            {message.editedAt && <span className="text-[11px] text-muted-foreground">(edited)</span>}
          </>
        )}

        {message.reactions.length > 0 && !isDeleted && (
          <div className="mt-1">
            <ReactionBar messageId={message.id} reactions={message.reactions} currentUserId={currentUserId} />
          </div>
        )}
      </div>

      {!isDeleted && !editing && (
        <div className="absolute -top-3 right-3 hidden items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 shadow-sm group-hover:flex">
          <Popover open={reactionPickerOpen} onOpenChange={setReactionPickerOpen}>
            <PopoverTrigger
              render={
                <ActionButton title="React">
                  <SmilePlus className="h-3.5 w-3.5" />
                </ActionButton>
              }
            />
            <PopoverContent className="w-auto border-none p-0" align="end">
              <EmojiPicker
                onEmojiClick={(d: EmojiClickData) => reactWith(d.emoji)}
                theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                height={360}
              />
            </PopoverContent>
          </Popover>
          <ActionButton title="Reply" onClick={() => onReply(message)}>
            <Reply className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton title="Star" onClick={toggleStar}>
            <Star className={cn("h-3.5 w-3.5", message.isStarred && "fill-current text-amber-500")} />
          </ActionButton>
          {canEdit && (
            <ActionButton title="Edit" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          {canModerate && (
            <ActionButton title={message.isPinned ? "Unpin" : "Pin"} onClick={togglePin}>
              {message.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </ActionButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <ActionButton title="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </ActionButton>
              }
            />
            <DropdownMenuContent align="end">
              {!isMine && <DropdownMenuItem onClick={reportMessage}>Report message</DropdownMenuItem>}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}

const ActionButton = forwardRef<
  HTMLButtonElement,
  { children: React.ReactNode; onClick?: () => void; title: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ActionButton({ children, title, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
