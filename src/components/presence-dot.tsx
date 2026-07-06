import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/types/chat";

const COLORS: Record<PresenceStatus, string> = {
  ONLINE: "bg-emerald-500",
  AWAY: "bg-amber-500",
  OFFLINE: "bg-muted-foreground/40",
};

export function PresenceDot({ status, className }: { status: PresenceStatus; className?: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar",
        COLORS[status],
        className
      )}
    />
  );
}
