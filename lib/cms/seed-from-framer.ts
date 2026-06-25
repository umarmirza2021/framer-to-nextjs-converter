import type { DetectedCmsCollection } from "@/lib/cms/framer-detector";
import { serializeEntryValues } from "@/lib/cms/serialize-entry";
import { prisma } from "@/lib/prisma";

export async function seedCmsFromDetection(
  projectId: string,
  collections: DetectedCmsCollection[],
  options?: { replace?: boolean }
): Promise<number> {
  if (collections.length === 0) return 0;

  const existing = await prisma.cmsCollection.count({ where: { projectId } });
  if (existing > 0 && !options?.replace) return 0;

  if (existing > 0 && options?.replace) {
    await prisma.cmsEntry.deleteMany({
      where: { collection: { projectId } },
    });
    await prisma.cmsField.deleteMany({
      where: { collection: { projectId } },
    });
    await prisma.cmsCollection.deleteMany({ where: { projectId } });
  }

  let created = 0;

  for (const detected of collections) {
    const collection = await prisma.cmsCollection.create({
      data: {
        projectId,
        name: detected.name,
        slug: detected.slug,
      },
    });

    const fieldIdBySlug = new Map<string, string>();

    for (let i = 0; i < detected.fields.length; i++) {
      const field = detected.fields[i];
      const createdField = await prisma.cmsField.create({
        data: {
          collectionId: collection.id,
          name: field.name,
          slug: field.slug,
          type: field.type,
          required: field.required ?? false,
          options: field.options ? JSON.stringify(field.options) : null,
          sortOrder: i,
        },
      });
      fieldIdBySlug.set(field.slug, createdField.id);
    }

    for (const entry of detected.entries) {
      await prisma.cmsEntry.create({
        data: {
          collectionId: collection.id,
          slug: entry.slug,
          values: serializeEntryValues(entry.values),
          published: entry.published,
        },
      });
    }

    created++;
  }

  return created;
}