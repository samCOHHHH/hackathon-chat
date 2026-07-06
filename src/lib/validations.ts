import { z } from "zod";

export const roleEnum = z.enum(["PARTICIPANT", "MENTOR", "JUDGE", "ORGANIZER"]);

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  teamName: z.string().trim().max(80).optional().or(z.literal("")),
  role: roleEnum.default("PARTICIPANT"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const messageCreateSchema = z.object({
  conversationId: z.string().cuid(),
  content: z.string().trim().max(8000),
  replyToId: z.string().cuid().optional().nullable(),
  type: z.enum(["TEXT", "IMAGE", "FILE", "GIF", "VOICE"]).default("TEXT"),
  attachments: z
    .array(
      z.object({
        url: z.string().min(1),
        name: z.string().max(255),
        size: z.number().int().nonnegative(),
        mimeType: z.string().max(120),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
      })
    )
    .max(10)
    .optional(),
  mentionUserIds: z.array(z.string().cuid()).max(50).optional(),
  scheduledFor: z.coerce.date().optional().nullable(),
});

export const messageEditSchema = z.object({
  messageId: z.string().cuid(),
  content: z.string().trim().min(1).max(8000),
});

export const reactionSchema = z.object({
  messageId: z.string().cuid(),
  emoji: z.string().min(1).max(16),
});

export const conversationCreateSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]),
  name: z.string().trim().max(80).optional(),
  memberIds: z.array(z.string().cuid()).min(1).max(200),
});

export const groupUpdateSchema = z.object({
  conversationId: z.string().cuid(),
  name: z.string().trim().min(1).max(80).optional(),
  image: z.string().optional(),
});

export const pollCreateSchema = z.object({
  conversationId: z.string().cuid(),
  question: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(10),
  allowMultiple: z.boolean().default(false),
});

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
