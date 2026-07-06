"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Search, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AvatarUpload } from "@/components/avatar-upload";
import { fetcher, apiPost } from "@/lib/fetcher";
import type { DirectoryUser } from "@/types/chat";
import { Badge } from "@/components/ui/badge";

export function NewConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: users } = useSWR<DirectoryUser[]>(
    open ? `/api/users?q=${encodeURIComponent(query)}` : null,
    fetcher
  );

  function toggleSelect(u: DirectoryUser) {
    setSelected((prev) =>
      prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]
    );
  }

  async function startDirect(u: DirectoryUser) {
    if (u.blockingMe) {
      toast.error("This user has blocked you");
      return;
    }
    if (u.blockedByMe) {
      toast.error("Unblock this user first");
      return;
    }
    setCreating(true);
    try {
      const res = await apiPost<{ id: string }>("/api/conversations", {
        type: "DIRECT",
        memberIds: [u.id],
      });
      onOpenChange(false);
      router.push(`/chat/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start conversation");
    } finally {
      setCreating(false);
    }
  }

  async function createGroup() {
    if (selected.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    setCreating(true);
    try {
      const res = await apiPost<{ id: string }>("/api/conversations", {
        type: "GROUP",
        name: groupName || `${selected.length + 1}-person group`,
        memberIds: selected.map((s) => s.id),
      });
      if (groupImage) {
        await fetch(`/api/conversations/${res.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: groupImage }),
        });
      }
      onOpenChange(false);
      setSelected([]);
      setGroupName("");
      setGroupImage(null);
      router.push(`/chat/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>Message a participant directly or start a group.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1">
              Direct message
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Group
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or team…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {users?.map((u) => (
                <button
                  key={u.id}
                  disabled={creating}
                  onClick={() => startDirect(u)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-accent disabled:opacity-50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback>{u.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.teamName ?? u.email}
                    </p>
                  </div>
                  {u.blockingMe && <Badge variant="secondary">Blocked you</Badge>}
                </button>
              ))}
              {users?.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No participants found</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-3">
            <AvatarUpload value={groupImage} onChange={setGroupImage} fallback="G" size={64} />
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                    {s.name}
                    <button onClick={() => toggleSelect(s)} className="rounded-full p-0.5 hover:bg-muted">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Add members…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {users?.map((u) => {
                const isSelected = selected.some((s) => s.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleSelect(u)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-accent"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>{u.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.teamName ?? u.email}</p>
                    </div>
                    {isSelected && <Badge>Selected</Badge>}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={createGroup} disabled={creating} className="w-full">
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create group
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
