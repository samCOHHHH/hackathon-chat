"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { FileText, MessageSquare, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetcher, apiPost } from "@/lib/fetcher";

type SearchResults = {
  people: { id: string; name: string; email: string; image: string | null }[];
  groups: { id: string; name: string | null; image: string | null }[];
  messages: { id: string; conversationId: string; content: string; sender: { name: string } }[];
  files: { id: string; name: string; url: string; conversationId: string }[];
};

export function GlobalSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data } = useSWR<SearchResults>(
    open && query.length > 0 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  async function goToPerson(id: string) {
    const res = await apiPost<{ id: string }>("/api/conversations", { type: "DIRECT", memberIds: [id] });
    onOpenChange(false);
    router.push(`/chat/${res.id}`);
  }

  function goToConversation(conversationId: string) {
    onOpenChange(false);
    router.push(`/chat/${conversationId}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search HackChat">
      <CommandInput placeholder="Search people, groups, messages, files…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {data?.people && data.people.length > 0 && (
          <CommandGroup heading="People">
            {data.people.map((p) => (
              <CommandItem key={p.id} onSelect={() => goToPerson(p.id)}>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={p.image ?? undefined} />
                  <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.groups && data.groups.length > 0 && (
          <CommandGroup heading="Groups">
            {data.groups.map((g) => (
              <CommandItem key={g.id} onSelect={() => goToConversation(g.id)}>
                <Users className="h-4 w-4" />
                {g.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.messages && data.messages.length > 0 && (
          <CommandGroup heading="Messages">
            {data.messages.map((m) => (
              <CommandItem key={m.id} onSelect={() => goToConversation(m.conversationId)}>
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  <span className="font-medium">{m.sender.name}: </span>
                  {m.content}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.files && data.files.length > 0 && (
          <CommandGroup heading="Files">
            {data.files.map((f) => (
              <CommandItem key={f.id} onSelect={() => goToConversation(f.conversationId)}>
                <FileText className="h-4 w-4" />
                {f.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
