import { NextRequest, NextResponse } from "next/server";
import {
  convertForPreview,
  formatConversionError,
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

    const { previewId, stats, siteName, title, cms } =
      await convertForPreview(normalizedUrl);

    return NextResponse.json({
      previewId,
      stats,
      siteName,
      title,
      cms: {
        status: cms.status,
        message: cms.message,
        collectionCount: cms.collections.length,
        fieldCount: cms.collections.reduce((n, c) => n + c.fields.length, 0),
        entryCount: cms.collections.reduce((n, c) => n + c.entries.length, 0),
        collections: cms.collections.map((c) => ({
          name: c.name,
          fieldCount: c.fields.length,
          entryCount: c.entries.length,
          fields: c.fields.map((f) => f.name),
        })),
      },
    });
  } catch (error) {
    const message = formatConversionError(error);
    const isTimeout = /timed out|timeout/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isTimeout ? 504 : 500 }
    );
  }
}