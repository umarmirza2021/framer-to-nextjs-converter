import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  const { userId, filename } = await params;

  if (!/^[\w-]+\.[a-z0-9]+$/i.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, userId, filename);

  try {
    const data = await fs.readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME[ext] || "application/octet-stream";

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}