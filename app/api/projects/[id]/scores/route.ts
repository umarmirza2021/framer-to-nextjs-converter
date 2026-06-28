import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPageSpeedScores } from "@/lib/perf/pagespeed";

export const maxDuration = 120;

/** Return cached before/after scores, if any. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ scores: project.perfScores ? JSON.parse(project.perfScores) : null });
}

/** Measure before (Framer source) vs after (deployed site) and cache the result. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // The live (after) URL is the latest successful deployment.
  const lastDeploy = await prisma.deployment.findFirst({
    where: { projectId: id, status: "READY", url: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  const afterUrl = lastDeploy?.url;

  if (!afterUrl) {
    return NextResponse.json(
      { error: "Deploy this project first, then measure the improvement." },
      { status: 400 }
    );
  }

  try {
    const [before, after] = await Promise.all([
      getPageSpeedScores(project.framerUrl),
      getPageSpeedScores(afterUrl),
    ]);
    const scores = { before, after, afterUrl, measuredAt: new Date().toISOString() };
    await prisma.project.update({ where: { id }, data: { perfScores: JSON.stringify(scores) } });
    return NextResponse.json({ scores });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Measurement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
