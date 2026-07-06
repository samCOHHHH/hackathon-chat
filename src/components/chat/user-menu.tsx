"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Moon, Sun, Settings, LogOut, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { PresenceDot } from "@/components/presence-dot";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <div className="border-t border-sidebar-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-sidebar-accent">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <PresenceDot status="ONLINE" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.teamName ?? session.user.role}</p>
          </div>
          {session.user.role !== "PARTICIPANT" && (
            <Badge variant="secondary" className="text-[10px]">
              {session.user.role}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="h-4 w-4" /> System
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
