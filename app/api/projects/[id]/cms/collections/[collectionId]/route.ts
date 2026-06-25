import { NextRequest, NextResponse } from "next/server";
import { parseStoredEntryValues } from "@/lib/cms/serialize-entry";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id, collectionId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const collection = await prisma.cmsCollection.findFirst({
    where: { id: collectionId, projectId: id },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      entries: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({
    collection: {
      ...collection,
      entries: collection.entries.map((e) => ({
        ...e,
        values: parseStoredEntryValues(e.values),
      })),
      fields: collection.fields.map((f) => ({
        ...f,
        options: f.options ? JSON.parse(f.options) : null,
      })),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id, collectionId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const collection = await prisma.cmsCollection.findFirst({
    where: { id: collectionId, projectId: id },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  await prisma.cmsCollection.delete({ where: { id: collectionId } });
  return NextResponse.json({ ok: true });
}