"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/fetcher";
import { toast } from "sonner";

export function CreatePollDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [creating, setCreating] = useState(false);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  async function create() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      toast.error("Add a question and at least two options");
      return;
    }
    setCreating(true);
    try {
      await apiPost("/api/polls", {
        conversationId,
        question: question.trim(),
        options: cleanOptions,
        allowMultiple,
      });
      onOpenChange(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Ask a question…" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={o}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="allow-multiple">Allow multiple choices</Label>
            <Switch id="allow-multiple" checked={allowMultiple} onCheckedChange={setAllowMultiple} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={creating} className="w-full">
            Create poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
