import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/db";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Serves admin-uploaded images from DATA_DIR/uploads. Filenames are content
 * hashes, so responses are immutable-cacheable.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const name = segments.join("/");

  // Traversal guard: resolved path must stay inside the uploads directory.
  const base = uploadsDir();
  const resolved = path.resolve(base, name);
  if (!resolved.startsWith(base + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const type = TYPES[path.extname(resolved).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
