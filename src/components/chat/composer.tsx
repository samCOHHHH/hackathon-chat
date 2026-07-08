"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Send, Paperclip, Smile, X, Reply, Mic, Square, BarChart3, Loader2, FileText } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiPost } from "@/lib/fetcher";
import { useTypingIndicator } from "@/hooks/use-typing";
import { CreatePollDialog } from "@/components/chat/create-poll-dialog";
import type { MessageDTO } from "@/lib/message-dto";

type PendingAttachment = {
  key: string;
  file: File;
  previewUrl: string | null;
  uploading: boolean;
  uploaded: { url: string; name: string; size: number; mimeType: string } | null;
};

type MemberOption = { id: string; name: string; image: string | null };

export function Composer({
  conversationId,
  members,
  replyTo,
  onCancelReply,
}: {
  conversationId: string;
  members: MemberOption[];
  replyTo: MessageDTO | null;
  onCancelReply: () => void;
}) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [mentionIds, setMentionIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { resolvedTheme } = useTheme();
  const { notifyTyping, notifyStopTyping } = useTypingIndicator(conversationId);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const uploadFile = useCallback(async (file: File) => {
    const key = `${file.name}-${Date.now()}-${Math.random()}`;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setAttachments((prev) => [...prev, { key, file, previewUrl, uploading: true, uploaded: null }]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAttachments((prev) =>
        prev.map((a) => (a.key === key ? { ...a, uploading: false, uploaded: data } : a))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setAttachments((prev) => prev.filter((a) => a.key !== key));
    }
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach(uploadFile);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  function removeAttachment(key: string) {
    setAttachments((prev) => prev.filter((a) => a.key !== key));
  }

  function handleTextChange(value: string) {
    setContent(value);
    notifyTyping();

    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_ ]{0,30})$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: MemberOption) {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const upToCursor = content.slice(0, cursor);
    const rest = content.slice(cursor);
    const replaced = upToCursor.replace(/@([a-zA-Z0-9_ ]{0,30})$/, `@${member.name} `);
    setContent(replaced + rest);
    setMentionIds((prev) => new Set(prev).add(member.id));
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function insertEmoji(data: EmojiClickData) {
    setContent((prev) => prev + data.emoji);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const file = new File([blob], "voice-message.webm", { type: "audio/webm" });
        await uploadFile(file);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSend() {
    const trimmed = content.trim();
    const uploaded = attachments.filter((a) => a.uploaded).map((a) => a.uploaded!);
    if (!trimmed && uploaded.length === 0) return;
    if (attachments.some((a) => a.uploading)) {
      toast.error("Wait for uploads to finish");
      return;
    }

    const firstMime = uploaded[0]?.mimeType ?? "";
    const type = firstMime.startsWith("audio/")
      ? "VOICE"
      : firstMime === "image/gif"
        ? "GIF"
        : firstMime.startsWith("image/")
          ? "IMAGE"
          : uploaded.length > 0
            ? "FILE"
            : "TEXT";

    setSending(true);
    try {
      await apiPost("/api/messages", {
        conversationId,
        content: trimmed,
        type,
        attachments: uploaded,
        replyToId: replyTo?.id ?? null,
        mentionUserIds: Array.from(mentionIds),
      });
      setContent("");
      setAttachments([]);
      setMentionIds(new Set());
      onCancelReply();
      notifyStopTyping();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const filteredMentionMembers =
    mentionQuery !== null
      ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
      : [];

  return (
    <div {...getRootProps()} className="relative border-t border-border bg-background p-3">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <p className="text-sm font-medium text-primary">Drop files to upload</p>
        </div>
      )}

      {filteredMentionMembers.length > 0 && (
        <div className="absolute bottom-full left-3 mb-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {filteredMentionMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMention(m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Reply className="h-3.5 w-3.5" />
            Replying to <span className="font-medium text-foreground">{replyTo.sender.name}</span>
          </span>
          <button onClick={onCancelReply}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div key={a.key} className="relative flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt={a.file.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <FileText className="h-6 w-6 text-primary" />
              )}
              <span className="max-w-32 truncate">{a.file.name}</span>
              {a.uploading && <Loader2 className="h-3 w-3 animate-spin" />}
              <button onClick={() => removeAttachment(a.key)}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={openFilePicker}>Upload image / file / GIF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPollOpen(true)}>
              <BarChart3 className="h-4 w-4" /> Create poll
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onBlur={notifyStopTyping}
          placeholder="Message… use @ to mention someone"
          className="max-h-40 min-h-10 flex-1 resize-none"
          rows={1}
        />

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-4 w-4" />
              </Button>
            }
          />
          <PopoverContent className="w-auto border-none p-0" align="end">
            <EmojiPicker onEmojiClick={insertEmoji} theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT} height={360} />
          </PopoverContent>
        </Popover>

        <Button
          variant={recording ? "destructive" : "ghost"}
          size="icon"
          className="shrink-0"
          onClick={recording ? stopRecording : startRecording}
          title="Voice message"
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button onClick={handleSend} disabled={sending} size="icon" className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <CreatePollDialog conversationId={conversationId} open={pollOpen} onOpenChange={setPollOpen} />
    </div>
  );
}
