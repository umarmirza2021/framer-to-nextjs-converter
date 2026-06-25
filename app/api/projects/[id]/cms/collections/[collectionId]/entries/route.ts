import { NextRequest, NextResponse } from "next/server";
import {
  parseStoredEntryValues,
  serializeEntryValues,
} from "@/lib/cms/serialize-entry";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";
import { slugify } from "@/lib/cms/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id, collectionId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const collection = await prisma.cmsCollection.findFirst({
    where: { id: collectionId, projectId: id },
    include: { fields: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const body = await request.json();
  const slug = slugify(body.slug || `entry-${Date.now()}`);
  const values =
    body.values && typeof body.values === "object" ? body.values : {};

  try {
    const entry = await prisma.cmsEntry.create({
      data: {
        collectionId,
        slug,
        values: serializeEntryValues(values),
        published: !!body.published,
      },
    });

    return NextResponse.json(
      {
        entry: { ...entry, values: parseStoredEntryValues(entry.values) },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Entry slug already exists" }, { status: 409 });
  }
}