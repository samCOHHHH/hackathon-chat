"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiPost } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type ReactionGroup = { emoji: string; userIds: string[]; names: string[] };

export function ReactionBar({
  messageId,
  reactions,
  currentUserId,
}: {
  messageId: string;
  reactions: ReactionGroup[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  async function toggle(emoji: string) {
    await apiPost(`/api/messages/${messageId}/reactions`, { emoji });
  }

  function onPick(data: EmojiClickData) {
    toggle(data.emoji);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {reactions.map((r) => {
        const mine = r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => toggle(r.emoji)}
            title={r.names.join(", ")}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition",
              mine ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/50 hover:bg-muted"
            )}
          >
            <span>{r.emoji}</span>
            <span>{r.userIds.length}</span>
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
          }
        />
        <PopoverContent className="w-auto border-none p-0" align="start">
          <EmojiPicker onEmojiClick={onPick} theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT} height={360} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
