"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AvatarUpload({
  value,
  onChange,
  fallback,
  size = 96,
}: {
  value: string | null;
  onChange: (url: string) => void;
  fallback: string;
  size?: number;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        onChange(data.url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative mx-auto flex cursor-pointer items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-primary/50",
        isDragActive && "ring-primary"
      )}
      style={{ width: size, height: size }}
    >
      <input {...getInputProps()} />
      <Avatar style={{ width: size, height: size }}>
        <AvatarImage src={value ?? undefined} alt="avatar" />
        <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
      </Avatar>
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </div>
    </div>
  );
}
