"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Smile, X, Reply, BarChart3, Loader2 } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiPost } from "@/lib/fetcher";
import { useTypingIndicator } from "@/hooks/use-typing";
import { CreatePollDialog } from "@/components/chat/create-poll-dialog";
import type { MessageDTO } from "@/lib/message-dto";

type MemberOption = { id: string; name: string; image: string | null };

export function Composer({
  conversationId,
  members,
  replyTo,
  onCancelReply,
}: {
  conversationId: string;
  members: MemberOption[];
  replyTo: MessageDTO | null;
  onCancelReply: () => void;
}) {
  const [content, setContent] = useState("");
  const [mentionIds, setMentionIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme } = useTheme();
  const { notifyTyping, notifyStopTyping } = useTypingIndicator(conversationId);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  function handleTextChange(value: string) {
    setContent(value);
    notifyTyping();

    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_ ]{0,30})$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: MemberOption) {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const upToCursor = content.slice(0, cursor);
    const rest = content.slice(cursor);
    const replaced = upToCursor.replace(/@([a-zA-Z0-9_ ]{0,30})$/, `@${member.name} `);
    setContent(replaced + rest);
    setMentionIds((prev) => new Set(prev).add(member.id));
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function insertEmoji(data: EmojiClickData) {
    setContent((prev) => prev + data.emoji);
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await apiPost("/api/messages", {
        conversationId,
        content: trimmed,
        type: "TEXT",
        replyToId: replyTo?.id ?? null,
        mentionUserIds: Array.from(mentionIds),
      });
      setContent("");
      setMentionIds(new Set());
      onCancelReply();
      notifyStopTyping();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const filteredMentionMembers =
    mentionQuery !== null
      ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
      : [];

  return (
    <div className="relative border-t border-border bg-background p-3">
      {filteredMentionMembers.length > 0 && (
        <div className="absolute bottom-full left-3 mb-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {filteredMentionMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMention(m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Reply className="h-3.5 w-3.5" />
            Replying to <span className="font-medium text-foreground">{replyTo.sender.name}</span>
          </span>
          <button onClick={onCancelReply}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          title="Create poll"
          onClick={() => setPollOpen(true)}
        >
          <BarChart3 className="h-4 w-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onBlur={notifyStopTyping}
          placeholder="Message… use @ to mention someone"
          className="max-h-40 min-h-10 flex-1 resize-none"
          rows={1}
        />

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-4 w-4" />
              </Button>
            }
          />
          <PopoverContent className="w-auto border-none p-0" align="end">
            <EmojiPicker onEmojiClick={insertEmoji} theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT} height={360} />
          </PopoverContent>
        </Popover>

        <Button onClick={handleSend} disabled={sending} size="icon" className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <CreatePollDialog conversationId={conversationId} open={pollOpen} onOpenChange={setPollOpen} />
    </div>
  );
}
