import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";
import { CMS_FIELD_TYPES, slugify } from "@/lib/cms/types";

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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";

  if (!name) {
    return NextResponse.json({ error: "Field name is required" }, { status: 400 });
  }

  if (!CMS_FIELD_TYPES.some((f) => f.type === type)) {
    return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
  }

  const slug = slugify(body.slug || name);
  const maxOrder = collection.fields.reduce((m, f) => Math.max(m, f.sortOrder), -1);

  try {
    const field = await prisma.cmsField.create({
      data: {
        collectionId,
        name,
        slug,
        type,
        required: !!body.required,
        options: body.options ? JSON.stringify(body.options) : null,
        refCollectionId: body.refCollectionId || null,
        sortOrder: maxOrder + 1,
      },
    });

    return NextResponse.json(
      {
        field: {
          ...field,
          options: field.options ? JSON.parse(field.options) : null,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Field slug already exists" }, { status: 409 });
  }
}