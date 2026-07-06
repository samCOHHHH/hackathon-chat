"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { apiPost } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type PollOption = { id: string; text: string; voteCount: number; votedByMe: boolean };
type Poll = { id: string; question: string; allowMultiple: boolean; closesAt: string | null; options: PollOption[] };

function isClosed(closesAt: string | null): boolean {
  return closesAt ? new Date(closesAt).getTime() < Date.now() : false;
}

export function PollWidget({ poll }: { poll: Poll }) {
  const [voting, setVoting] = useState<string | null>(null);
  const [closed, setClosed] = useState(() => isClosed(poll.closesAt));
  const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);

  useEffect(() => {
    setClosed(isClosed(poll.closesAt));
  }, [poll.closesAt]);

  async function vote(optionId: string) {
    if (closed) return;
    setVoting(optionId);
    try {
      await apiPost(`/api/polls/${optionId}/vote`);
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="w-72 space-y-2.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 font-medium">
        <BarChart3 className="h-4 w-4 text-primary" />
        {poll.question}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const pct = totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0;
          return (
            <button
              key={o.id}
              disabled={voting === o.id || closed}
              onClick={() => vote(o.id)}
              className="relative block w-full overflow-hidden rounded-lg border border-border text-left text-sm transition hover:border-primary/50 disabled:cursor-default"
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="flex items-center gap-1.5">
                  {o.votedByMe && <Check className="h-3.5 w-3.5 text-primary" />}
                  {o.text}
                </span>
                <span className={cn("shrink-0 text-xs text-muted-foreground")}>
                  {o.voteCount} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {totalVotes} vote{totalVotes === 1 ? "" : "s"} {closed && "· Closed"}
      </p>
    </div>
  );
}
