import { NextRequest, NextResponse } from "next/server";
import {
  convertAndZip,
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
      return NextResponse.json({ error: "Please provide a Framer site URL." }, { status: 400 });
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

    const { zip, stats, siteName } = await convertAndZip(normalizedUrl);

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${siteName}-nextjs.zip"`,
        "X-Pages-Converted": String(stats.pages),
        "X-Assets-Downloaded": String(stats.assets),
        "X-CSS-Size": String(stats.cssSize),
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