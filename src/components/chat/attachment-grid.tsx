"use client";

import { FileArchive, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Attachment = {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentGrid({ attachments, messageType }: { attachments: Attachment[]; messageType: string }) {
  if (attachments.length === 0) return null;

  if (messageType === "VOICE") {
    const a = attachments[0];
    return (
      <audio controls src={a.url} className="h-10 max-w-xs">
        Your browser does not support audio playback.
      </audio>
    );
  }

  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const videos = attachments.filter((a) => a.mimeType.startsWith("video/"));
  const others = attachments.filter((a) => !a.mimeType.startsWith("image/") && !a.mimeType.startsWith("video/"));

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className={cn("grid gap-1.5", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="max-h-72 w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {videos.map((a) => (
        <video key={a.id} controls src={a.url} className="max-h-72 max-w-sm rounded-xl border border-border" />
      ))}
      {others.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          download={a.name}
          className="flex max-w-xs items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition hover:bg-accent"
        >
          {a.mimeType.includes("zip") ? (
            <FileArchive className="h-8 w-8 shrink-0 text-primary" />
          ) : (
            <FileText className="h-8 w-8 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{a.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
          </div>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
