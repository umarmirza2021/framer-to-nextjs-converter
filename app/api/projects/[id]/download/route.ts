import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createZip } from "@/lib/converter/zip";
import { deserializeFiles } from "@/lib/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const files = deserializeFiles(project.filesJson);
    const zip = await createZip(files);
    const stats = JSON.parse(project.stats) as { pages: number; assets: number; cssSize: number };

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.siteName}-nextjs.zip"`,
        "X-Pages-Converted": String(stats.pages),
        "X-Assets-Downloaded": String(stats.assets),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate download" }, { status: 500 });
  }
}