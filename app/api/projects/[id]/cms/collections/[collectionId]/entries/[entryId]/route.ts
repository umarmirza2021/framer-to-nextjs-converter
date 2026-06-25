import { NextRequest, NextResponse } from "next/server";
import {
  mergeEntryValues,
  parseStoredEntryValues,
  serializeEntryValues,
} from "@/lib/cms/serialize-entry";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";
import { slugify } from "@/lib/cms/types";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; collectionId: string; entryId: string }> }
) {
  const { id, collectionId, entryId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entry = await prisma.cmsEntry.findFirst({
    where: { id: entryId, collection: { id: collectionId, projectId: id } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({
    entry: { ...entry, values: parseStoredEntryValues(entry.values) },
  });
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; collectionId: string; entryId: string }> }
) {
  const { id, collectionId, entryId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entry = await prisma.cmsEntry.findFirst({
    where: { id: entryId, collection: { id: collectionId, projectId: id } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: { values?: string; published?: boolean; slug?: string } = {};

  if (body.values && typeof body.values === "object") {
    data.values = serializeEntryValues(
      mergeEntryValues(entry.values, body.values)
    );
  }
  if (typeof body.published === "boolean") {
    data.published = body.published;
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    data.slug = slugify(body.slug);
  }

  try {
    const updated = await prisma.cmsEntry.update({
      where: { id: entryId },
      data,
    });

    return NextResponse.json({
      entry: { ...updated, values: parseStoredEntryValues(updated.values) },
    });
  } catch {
    return NextResponse.json({ error: "Entry slug already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; collectionId: string; entryId: string }> }
) {
  const { id, collectionId, entryId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const entry = await prisma.cmsEntry.findFirst({
    where: { id: entryId, collection: { id: collectionId, projectId: id } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await prisma.cmsEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}