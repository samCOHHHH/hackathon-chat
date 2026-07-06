"use client";

import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetcher } from "@/lib/fetcher";
import { formatConversationTimestamp } from "@/lib/format-time";
import type { MessageDTO } from "@/lib/message-dto";

export function PinnedMessagesDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data } = useSWR<MessageDTO[]>(
    open ? `/api/conversations/${conversationId}/pinned` : null,
    fetcher
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pinned messages</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {data?.length === 0 && <p className="text-sm text-muted-foreground">No pinned messages yet</p>}
          {data?.map((m) => (
            <div key={m.id} className="flex gap-2.5 rounded-lg border border-border p-2.5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={m.sender.image ?? undefined} />
                <AvatarFallback>{m.sender.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {m.sender.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    {formatConversationTimestamp(m.createdAt)}
                  </span>
                </p>
                <p className="truncate text-sm">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
