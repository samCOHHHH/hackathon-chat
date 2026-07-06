"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Crown, LogOut, Search, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { PresenceDot } from "@/components/presence-dot";
import { fetcher, apiPatch, apiPost, apiDelete } from "@/lib/fetcher";
import type { ConversationDetail, DirectoryUser } from "@/types/chat";

export function GroupSettingsDialog({
  conversationId,
  open,
  onOpenChange,
  currentUserId,
  onLeft,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  onLeft: () => void;
}) {
  const { data: detail, mutate } = useSWR<ConversationDetail>(
    open ? `/api/conversations/${conversationId}` : null,
    fetcher
  );
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { data: users } = useSWR<DirectoryUser[]>(
    open && query ? `/api/users?q=${encodeURIComponent(query)}` : null,
    fetcher
  );

  const me = detail?.members.find((m) => m.userId === currentUserId);
  const isAdmin = me?.isAdmin ?? false;

  async function saveName() {
    if (!name.trim()) return;
    await apiPatch(`/api/conversations/${conversationId}`, { name });
    setName("");
    mutate();
  }

  async function saveImage(url: string) {
    setImage(url);
    await apiPatch(`/api/conversations/${conversationId}`, { image: url });
    mutate();
  }

  async function addMember(userId: string) {
    await apiPost(`/api/conversations/${conversationId}/members`, { memberIds: [userId] });
    setQuery("");
    mutate();
  }

  async function removeMember(userId: string) {
    await apiDelete(`/api/conversations/${conversationId}/members?userId=${userId}`);
    mutate();
  }

  async function toggleAdmin(userId: string, isCurrentlyAdmin: boolean) {
    await apiPatch(`/api/conversations/${conversationId}/members/${userId}`, { isAdmin: !isCurrentlyAdmin });
    mutate();
  }

  async function leaveGroup() {
    if (!window.confirm("Leave this group?")) return;
    try {
      await apiDelete(`/api/conversations/${conversationId}/members`);
      onOpenChange(false);
      onLeft();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave group");
    }
  }

  if (!detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <AvatarUpload value={image ?? detail.image} onChange={saveImage} fallback={(detail.name ?? "G").slice(0, 2)} size={64} />
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={detail.name ?? "Group name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
              />
              {isAdmin && name && (
                <Button size="sm" onClick={saveName}>
                  Rename group
                </Button>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Add members…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {users && users.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border">
                  {users
                    .filter((u) => !detail.members.some((m) => m.userId === u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addMember(u.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> {u.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="max-h-64 space-y-1 overflow-y-auto">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {detail.members.length} members
            </p>
            {detail.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent/50">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.user.image ?? undefined} />
                    <AvatarFallback>{m.user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <PresenceDot status={m.user.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.teamName ?? m.user.role}</p>
                </div>
                {m.isAdmin && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                {isAdmin && m.userId !== currentUserId && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleAdmin(m.userId, m.isAdmin)}>
                      {m.isAdmin ? "Revoke admin" : "Make admin"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeMember(m.userId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={leaveGroup} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Leave group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
