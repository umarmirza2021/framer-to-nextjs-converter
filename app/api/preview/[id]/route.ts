import { NextRequest, NextResponse } from "next/server";
import { getPreviewHtml } from "@/lib/converter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const html = await getPreviewHtml(id);

  if (!html) {
    return NextResponse.json(
      { error: "Preview expired or not found. Please convert again." },
      { status: 404 }
    );
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}