import { NextRequest, NextResponse } from "next/server";
import {
  convertForPreview,
  isFramerUrl,
  normalizeFramerUrl,
} from "@/lib/converter";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a Framer site URL." },
        { status: 400 }
      );
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeFramerUrl(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    if (!isFramerUrl(normalizedUrl)) {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    const { previewId, stats, siteName, title } =
      await convertForPreview(normalizedUrl);

    return NextResponse.json({ previewId, stats, siteName, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}