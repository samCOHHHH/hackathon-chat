"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Megaphone, ShieldAlert, Users, Wifi } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PresenceDot } from "@/components/presence-dot";
import { fetcher, apiPatch, apiPost } from "@/lib/fetcher";
import { isSuperAdmin } from "@/lib/permissions";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  teamName: string | null;
  role: string;
  status: "ONLINE" | "AWAY" | "OFFLINE";
  lastSeen: string;
  isBanned: boolean;
  bannedReason: string | null;
  createdAt: string;
};

type Report = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { id: string; name: string; image: string | null };
  reportedUser: { id: string; name: string; image: string | null } | null;
  message: { id: string; content: string; conversationId: string; sender: { name: string } } | null;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const canManageRoles = isSuperAdmin(session?.user?.email);
  const { data: users, mutate: mutateUsers } = useSWR<AdminUser[]>("/api/admin/users", fetcher, {
    refreshInterval: 15_000,
  });
  const { data: reports, mutate: mutateReports } = useSWR<Report[]>("/api/admin/reports", fetcher);
  const [announcement, setAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);

  const onlineUsers = users?.filter((u) => u.status === "ONLINE") ?? [];

  async function toggleBan(user: AdminUser) {
    const reason = user.isBanned ? undefined : window.prompt("Reason for ban (optional):") ?? "";
    try {
      await apiPatch(`/api/admin/users/${user.id}`, {
        isBanned: !user.isBanned,
        ...(reason !== undefined ? { bannedReason: reason } : {}),
      });
      toast.success(user.isBanned ? "User unbanned" : "User banned");
      mutateUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function changeRole(user: AdminUser, role: string) {
    await apiPatch(`/api/admin/users/${user.id}`, { role });
    mutateUsers();
  }

  async function resolveReport(id: string, status: "RESOLVED" | "DISMISSED") {
    await apiPatch(`/api/admin/reports?id=${id}`, { status });
    mutateReports();
  }

  async function postAnnouncement() {
    if (!announcement.trim()) return;
    setPosting(true);
    try {
      await apiPost("/api/admin/announcements", { content: announcement });
      setAnnouncement("");
      toast.success("Announcement posted to #General");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Participants
          </TabsTrigger>
          <TabsTrigger value="online">
            <Wifi className="mr-1.5 h-3.5 w-3.5" /> Online ({onlineUsers.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Reports
            {reports && reports.filter((r) => r.status === "OPEN").length > 0 && (
              <Badge className="ml-1.5 h-4 px-1.5">{reports.filter((r) => r.status === "OPEN").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="announce">
            <Megaphone className="mr-1.5 h-3.5 w-3.5" /> Announce
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All participants ({users?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {users?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>{u.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <PresenceDot status={u.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {u.name}
                      {u.isBanned && <Badge variant="destructive">Banned</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email} {u.teamName && `· ${u.teamName}`}
                    </p>
                  </div>
                  {canManageRoles ? (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    >
                      <option value="PARTICIPANT">Participant</option>
                      <option value="MENTOR">Mentor</option>
                      <option value="JUDGE">Judge</option>
                      <option value="ORGANIZER">Organizer</option>
                    </select>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {u.role}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={u.isBanned ? "outline" : "destructive"}
                    onClick={() => toggleBan(u)}
                    className="gap-1"
                  >
                    {u.isBanned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    {u.isBanned ? "Unban" : "Ban"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online">
          <Card>
            <CardHeader>
              <CardTitle>Online now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {onlineUsers.length === 0 && <p className="text-sm text-muted-foreground">No one online right now</p>}
              {onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback>{u.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <PresenceDot status={u.status} />
                  </div>
                  <span className="text-sm">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.teamName}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Moderation reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reports?.length === 0 && <p className="text-sm text-muted-foreground">No reports filed</p>}
              {reports?.map((r) => (
                <div key={r.id} className="space-y-1.5 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-medium">{r.reporter.name}</span> reported{" "}
                      {r.reportedUser ? (
                        <span className="font-medium">{r.reportedUser.name}</span>
                      ) : (
                        <span className="font-medium">{r.message?.sender.name}&apos;s message</span>
                      )}
                    </p>
                    <Badge variant={r.status === "OPEN" ? "default" : "secondary"}>{r.status}</Badge>
                  </div>
                  {r.message && (
                    <p className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      &quot;{r.message.content}&quot;
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Reason: {r.reason}</p>
                  {r.status === "OPEN" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, "RESOLVED")}>
                        Mark resolved
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, "DISMISSED")}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announce">
          <Card>
            <CardHeader>
              <CardTitle>Post an announcement to #General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Lunch is served in the main hall! Demo submissions close at 5pm."
                className="min-h-24"
              />
              <Button onClick={postAnnouncement} disabled={posting} className="gap-2">
                <Megaphone className="h-4 w-4" /> Post announcement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
