import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runDeploy } from "@/lib/deploy/run";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const platform = body.platform === "NETLIFY" || body.platform === "VERCEL" ? body.platform : null;

  if (!platform) {
    return NextResponse.json({ error: "Select Netlify or Vercel" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const account = await prisma.deploymentAccount.findUnique({
    where: {
      userId_platform: { userId: session.user.id, platform },
    },
  });

  if (!account) {
    return NextResponse.json(
      {
        error: `Connect your ${platform === "NETLIFY" ? "Netlify" : "Vercel"} account in Settings first`,
      },
      { status: 400 }
    );
  }

  try {
    const { deploymentId, url } = await runDeploy(project, account, platform);
    return NextResponse.json({
      deployment: { id: deploymentId, platform, url, status: "READY" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  const deployments = await prisma.deployment.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ deployments });
}