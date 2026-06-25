import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveProjectFromCache } from "@/lib/projects";
import { z } from "zod";

const saveSchema = z.object({
  framerUrl: z.string().url(),
  previewId: z.string().uuid(),
  title: z.string().optional(),
  siteName: z.string().optional(),
  stats: z.object({
    pages: z.number(),
    assets: z.number(),
    cssSize: z.number(),
  }),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { project, cmsCollectionsCreated } = await saveProjectFromCache({
      userId: session.user.id,
      ...parsed.data,
      title: parsed.data.title || "Untitled Project",
      siteName: parsed.data.siteName || "framer-site",
    });

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        framerUrl: project.framerUrl,
        siteName: project.siteName,
        createdAt: project.createdAt,
      },
      cmsCollectionsCreated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}