import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getAdmin, requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { uploadsDir } from "@/db";
import { imageSpec } from "@/lib/image-specs";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB input cap; output is far smaller
const MAX_PIXELS = 24_000_000; // defend against huge dimensions / decompression bombs
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/**
 * Admin image upload. Every image is processed server-side: downscaled to the
 * best-fit bounds for its usage (`kind`, see src/lib/image-specs.ts), EXIF
 * stripped, re-encoded as WebP. Files are content-hashed (stable, cacheable,
 * query-free URLs) and stored under DATA_DIR/uploads.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP or AVIF images." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 12 MB)." }, { status: 400 });
  }

  const spec = imageSpec(kind);
  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: MAX_PIXELS });
    const meta = await image.metadata();
    if (meta.width && meta.height && meta.width * meta.height > MAX_PIXELS) {
      return NextResponse.json({ error: "Image dimensions are too large." }, { status: 400 });
    }
    processed = await image
      .rotate() // honor EXIF orientation before it is stripped
      .resize({ width: spec.maxW, height: spec.maxH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That file could not be read as an image." }, { status: 400 });
  }

  const name = createHash("sha1").update(processed).digest("hex").slice(0, 20) + ".webp";
  await fs.mkdir(uploadsDir(), { recursive: true });
  await fs.writeFile(path.join(uploadsDir(), name), processed);

  const publicPath = `/uploads/${name}`;
  const meta = await requestMeta();
  audit({
    actor: admin.email,
    action: "create",
    entityType: "upload",
    entityId: name,
    after: { path: publicPath, bytes: processed.length, kind: kind || "default", spec: spec.label },
    ...meta,
  });
  return NextResponse.json({ path: publicPath });
}
