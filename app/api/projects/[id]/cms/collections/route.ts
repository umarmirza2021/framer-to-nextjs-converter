import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";
import { slugify } from "@/lib/cms/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const collections = await prisma.cmsCollection.findMany({
    where: { projectId: id },
    include: {
      _count: { select: { fields: true, entries: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ collections });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
  }

  const slug = slugify(body.slug || name);

  try {
    const collection = await prisma.cmsCollection.create({
      data: { projectId: id, name, slug },
    });
    return NextResponse.json({ collection }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "A collection with this slug already exists" },
      { status: 409 }
    );
  }
}