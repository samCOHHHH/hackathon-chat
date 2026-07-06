"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";
import { apiPatch } from "@/lib/fetcher";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [teamName, setTeamName] = useState(session?.user?.teamName ?? "");
  const [image, setImage] = useState<string | null>(session?.user?.image ?? null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch("/api/users/me", { name, teamName, image });
      await update({ name, image, teamName });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update how you appear to other participants.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <AvatarUpload value={image} onChange={setImage} fallback={name.slice(0, 2) || "?"} />

          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Team name</Label>
            <Input value={teamName ?? ""} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session?.user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={session?.user?.role ?? ""} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
