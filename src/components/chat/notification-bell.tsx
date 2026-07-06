"use client";

import Link from "next/link";
import { Bell, AtSign, Reply, Heart, UserPlus, Megaphone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";

const ICONS = {
  MENTION: AtSign,
  REPLY: Reply,
  REACTION: Heart,
  INVITE: UserPlus,
  MESSAGE: MessageCircle,
  ANNOUNCEMENT: Megaphone,
};

const LABELS: Record<string, string> = {
  MENTION: "mentioned you",
  REPLY: "replied to you",
  REACTION: "reacted to your message",
  INVITE: "added you to a group",
  MESSAGE: "sent a message",
  ANNOUNCEMENT: "posted an announcement",
};

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <DropdownMenu onOpenChange={(open) => open && unreadCount > 0 && markAllRead()}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up</p>
          )}
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn(!n.isRead && "bg-accent/50")}
                  render={
                    <Link href={n.conversationId ? `/chat/${n.conversationId}` : "#"} className="items-start gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          <span className="font-medium">{n.actor?.name ?? "Someone"}</span>{" "}
                          {LABELS[n.type] ?? "sent you a notification"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  }
                />
              );
            })}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
