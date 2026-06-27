import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectFilesToDeployList } from "@/lib/deploy/files";
import { deployToNetlify } from "@/lib/deploy/netlify";
import { deployToVercel } from "@/lib/deploy/vercel";
import { convertFramerToNextJs } from "@/lib/converter";
import { serializeFiles } from "@/lib/projects";

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

  const deployment = await prisma.deployment.create({
    data: {
      projectId: id,
      platform,
      status: "BUILDING",
    },
  });

  try {
    let url: string;

    // Regenerate the project from the source URL with image optimization so the
    // deployed site self-hosts WebP images instead of pulling Framer's CDN.
    // Falls back to the stored files if the live re-conversion fails.
    let filesJson = project.filesJson;
    try {
      const optimized = await convertFramerToNextJs(project.framerUrl, {
        performanceMode: true,
      });
      filesJson = serializeFiles(optimized.files);
    } catch {
      // keep stored filesJson
    }

    if (platform === "VERCEL") {
      const files = projectFilesToDeployList(filesJson);
      const result = await deployToVercel(account.accessToken, project.siteName, files);
      url = result.url;
    } else {
      const result = await deployToNetlify(account.accessToken, project.siteName, filesJson);
      url = result.url;
    }

    await prisma.$transaction([
      prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "READY", url },
      }),
      prisma.project.update({
        where: { id },
        data: { status: "DEPLOYED" },
      }),
    ]);

    return NextResponse.json({
      deployment: { id: deployment.id, platform, url, status: "READY" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED" },
    });
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