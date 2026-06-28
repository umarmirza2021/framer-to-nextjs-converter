import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setNetlifyCustomDomain } from "@/lib/deploy/netlify";

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** Attach a custom domain to the project's deployed Netlify site. */
export async function POST(
  request: NextRequest,
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

  const body = await request.json();
  const domain = String(body.domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: "Enter a valid domain like example.com" }, { status: 400 });
  }

  if (!project.netlifySiteId) {
    return NextResponse.json(
      { error: "Deploy this project to Netlify first, then add a domain." },
      { status: 400 }
    );
  }

  const account = await prisma.deploymentAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "NETLIFY" } },
  });
  if (!account) {
    return NextResponse.json({ error: "Connect your Netlify account in Settings first." }, { status: 400 });
  }

  try {
    const result = await setNetlifyCustomDomain(account.accessToken, project.netlifySiteId, domain);
    await prisma.project.update({ where: { id }, data: { customDomain: result.domain } });

    const isApex = domain.split(".").length === 2;
    return NextResponse.json({
      domain: result.domain,
      // DNS the user must configure at their registrar.
      dns: isApex
        ? { type: "A", name: "@", value: "75.2.60.5" }
        : { type: "CNAME", name: domain.split(".")[0], value: result.netlifyHost },
      apex: isApex,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set domain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Remove the custom domain. */
export async function DELETE(
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
  await prisma.project.update({ where: { id }, data: { customDomain: null } });
  return NextResponse.json({ ok: true });
}
