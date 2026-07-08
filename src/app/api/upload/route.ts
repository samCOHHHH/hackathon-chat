import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/validations";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { UPLOAD_DIR } from "@/lib/upload-dir";

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext.length > 0 && ext.length < 10 ? ext : "";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload);
  if (!success) {
    return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 415 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = safeExt(file.name);
  const filename = `${nanoid()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({
    url: `/api/files/${filename}`,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });
}
