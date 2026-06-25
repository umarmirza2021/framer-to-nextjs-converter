import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/cms/project-access";

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; collectionId: string; fieldId: string }> }
) {
  const { id, collectionId, fieldId } = await params;
  const access = await requireProjectAccess(id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const field = await prisma.cmsField.findFirst({
    where: { id: fieldId, collection: { id: collectionId, projectId: id } },
  });

  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  await prisma.cmsField.delete({ where: { id: fieldId } });
  return NextResponse.json({ ok: true });
}