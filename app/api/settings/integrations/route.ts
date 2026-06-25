import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyNetlifyToken } from "@/lib/deploy/netlify";
import { verifyVercelToken } from "@/lib/deploy/vercel";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.deploymentAccount.findMany({
    where: { userId: session.user.id },
    select: { platform: true, accountName: true, updatedAt: true },
  });

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const platform = body.platform === "NETLIFY" || body.platform === "VERCEL" ? body.platform : null;
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";

  if (!platform || !accessToken) {
    return NextResponse.json({ error: "Platform and access token are required" }, { status: 400 });
  }

  try {
    const accountName =
      platform === "NETLIFY"
        ? await verifyNetlifyToken(accessToken)
        : await verifyVercelToken(accessToken);

    const account = await prisma.deploymentAccount.upsert({
      where: {
        userId_platform: { userId: session.user.id, platform },
      },
      create: {
        userId: session.user.id,
        platform,
        accessToken,
        accountName,
      },
      update: {
        accessToken,
        accountName,
      },
    });

    return NextResponse.json({
      account: {
        platform: account.platform,
        accountName: account.accountName,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platform = request.nextUrl.searchParams.get("platform");
  if (platform !== "NETLIFY" && platform !== "VERCEL") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await prisma.deploymentAccount.deleteMany({
    where: { userId: session.user.id, platform },
  });

  return NextResponse.json({ ok: true });
}