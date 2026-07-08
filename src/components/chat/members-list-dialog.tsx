"use client";

import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/presence-dot";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import type { ConversationDetail } from "@/types/chat";

export function MembersListDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: detail } = useSWR<ConversationDetail>(
    open ? `/api/conversations/${conversationId}` : null,
    fetcher
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{detail ? `${detail.members.length} members` : "Members"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {detail?.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent/50">
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.user.image ?? undefined} />
                  <AvatarFallback>{m.user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <PresenceDot status={m.user.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.user.teamName ?? "No team"}
                </p>
              </div>
              {m.user.role !== "PARTICIPANT" && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {m.user.role}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
