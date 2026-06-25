import { NextRequest, NextResponse } from "next/server";
import { formatConversionError, getCachedZip } from "@/lib/converter";

export const maxDuration = 120;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cached = await getCachedZip(id);

    if (!cached) {
      return NextResponse.json(
        { error: "Download expired or not found. Please convert again." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(cached.zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${cached.siteName}-nextjs.zip"`,
        "X-Pages-Converted": String(cached.stats.pages),
        "X-Assets-Downloaded": String(cached.stats.assets),
        "X-CSS-Size": String(cached.stats.cssSize),
      },
    });
  } catch (error) {
    const message = formatConversionError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}