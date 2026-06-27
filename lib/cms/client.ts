import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "./errors";
import { keyify, slugify } from "./slug";
import type {
  CMSBinding,
  CMSCollection,
  CMSField,
  CMSFieldType,
  CMSItem,
  CMSPage,
  CMSPageType,
  ListItemsOptions,
} from "./types";
import type { FieldInput } from "./validation";

// ── Mappers: Prisma records → JSON-safe spec types ───────────

type PrismaField = {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  defaultValue: unknown;
  sortOrder: number;
};

function mapField(f: PrismaField): CMSField {
  return {
    id: f.id,
    name: f.name,
    key: f.key,
    type: f.type as CMSFieldType,
    required: f.required,
    defaultValue: f.defaultValue ?? undefined,
  };
}

function mapCollection(c: {
  id: string;
  name: string;
  slug: string;
  fields?: PrismaField[];
  createdAt: Date;
  updatedAt: Date;
}): CMSCollection {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    fields: (c.fields ?? []).map(mapField),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function mapItem(i: {
  id: string;
  collectionId: string;
  slug: string;
  data: unknown;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CMSItem {
  return {
    id: i.id,
    collectionId: i.collectionId,
    slug: i.slug,
    data: (i.data as Record<string, unknown>) ?? {},
    published: i.published,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

function mapBinding(b: {
  layerId: string;
  layerType: string;
  collectionId: string;
  fieldKey: string;
  pageType: string;
}): CMSBinding {
  return {
    layerId: b.layerId,
    layerType: b.layerType as CMSBinding["layerType"],
    collectionId: b.collectionId,
    fieldKey: b.fieldKey,
    pageType: b.pageType as CMSPageType,
  };
}

function mapPage(p: {
  id: string;
  collectionId: string;
  pageType: string;
  framerPageId: string;
  route: string;
  bindings?: Parameters<typeof mapBinding>[0][];
}): CMSPage {
  return {
    id: p.id,
    collectionId: p.collectionId,
    pageType: p.pageType as CMSPageType,
    framerPageId: p.framerPageId,
    route: p.route,
    bindings: (p.bindings ?? []).map(mapBinding),
  };
}

function fieldCreateData(fields: FieldInput[]) {
  return fields.map((f, index) => ({
    name: f.name,
    key: f.key ? keyify(f.key) : keyify(f.name),
    type: f.type,
    required: f.required ?? false,
    defaultValue: (f.defaultValue ?? null) as never,
    sortOrder: index,
  }));
}

// ── Collections ──────────────────────────────────────────────

export async function listCollections(): Promise<
  (CMSCollection & { itemCount: number })[]
> {
  const collections = await prisma.cmsCollection.findMany({
    include: { fields: { orderBy: { sortOrder: "asc" } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return collections.map((c) => ({
    ...mapCollection(c),
    itemCount: c._count.items,
  }));
}

export async function createCollection(input: {
  name: string;
  slug?: string;
  fields?: FieldInput[];
}): Promise<CMSCollection> {
  const slug = slugify(input.slug || input.name);
  const existing = await prisma.cmsCollection.findUnique({ where: { slug } });
  if (existing) throw new ConflictError(`A collection with slug "${slug}" already exists`);

  const collection = await prisma.cmsCollection.create({
    data: {
      name: input.name,
      slug,
      fields: { create: fieldCreateData(input.fields ?? []) },
    },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  return mapCollection(collection);
}

export async function getCollection(id: string): Promise<CMSCollection> {
  const collection = await prisma.cmsCollection.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!collection) throw new NotFoundError("Collection not found");
  return mapCollection(collection);
}

export async function updateCollection(
  id: string,
  input: { name?: string; slug?: string; fields?: FieldInput[] }
): Promise<CMSCollection> {
  const existing = await prisma.cmsCollection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Collection not found");

  const nextSlug = input.slug ? slugify(input.slug) : undefined;
  if (nextSlug && nextSlug !== existing.slug) {
    const clash = await prisma.cmsCollection.findUnique({ where: { slug: nextSlug } });
    if (clash) throw new ConflictError(`A collection with slug "${nextSlug}" already exists`);
  }

  const collection = await prisma.$transaction(async (tx) => {
    await tx.cmsCollection.update({
      where: { id },
      data: { name: input.name ?? undefined, slug: nextSlug },
    });
    // If fields provided, replace the whole set (add/remove/reorder).
    if (input.fields) {
      await tx.cmsField.deleteMany({ where: { collectionId: id } });
      await tx.cmsField.createMany({
        data: fieldCreateData(input.fields).map((f) => ({ ...f, collectionId: id })),
      });
    }
    return tx.cmsCollection.findUnique({
      where: { id },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return mapCollection(collection!);
}

export async function deleteCollection(id: string): Promise<void> {
  const existing = await prisma.cmsCollection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Collection not found");
  // Cascade in schema removes fields, items, pages, and their bindings.
  await prisma.cmsCollection.delete({ where: { id } });
}

// ── Items ────────────────────────────────────────────────────

export async function listItems(
  collectionId: string,
  options: ListItemsOptions = {}
): Promise<{ items: CMSItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const where = {
    collectionId,
    ...(options.published !== undefined ? { published: options.published } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.cmsItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cmsItem.count({ where }),
  ]);
  return { items: items.map(mapItem), total, page, pageSize };
}

export async function createItem(
  collectionId: string,
  input: { slug?: string; data: Record<string, unknown>; published?: boolean }
): Promise<CMSItem> {
  const collection = await prisma.cmsCollection.findUnique({ where: { id: collectionId } });
  if (!collection) throw new NotFoundError("Collection not found");

  const baseSlug = slugify(
    input.slug ||
      (typeof input.data.slug === "string" && input.data.slug) ||
      (typeof input.data.title === "string" && input.data.title) ||
      `item-${Date.now()}`
  );
  const slug = await uniqueItemSlug(collectionId, baseSlug);

  const item = await prisma.cmsItem.create({
    data: {
      collectionId,
      slug,
      data: (input.data ?? {}) as never,
      published: input.published ?? false,
    },
  });
  return mapItem(item);
}

export async function getItem(id: string): Promise<CMSItem> {
  const item = await prisma.cmsItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError("Item not found");
  return mapItem(item);
}

export async function updateItem(
  id: string,
  input: { slug?: string; data?: Record<string, unknown>; published?: boolean }
): Promise<CMSItem> {
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Item not found");

  let slug = existing.slug;
  if (input.slug && slugify(input.slug) !== existing.slug) {
    slug = await uniqueItemSlug(existing.collectionId, slugify(input.slug), id);
  }

  const item = await prisma.cmsItem.update({
    where: { id },
    data: {
      slug,
      data: input.data !== undefined ? (input.data as never) : undefined,
      published: input.published ?? undefined,
    },
  });
  return mapItem(item);
}

export async function deleteItem(id: string): Promise<void> {
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Item not found");
  await prisma.cmsItem.delete({ where: { id } });
}

export async function togglePublish(id: string): Promise<CMSItem> {
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Item not found");
  const item = await prisma.cmsItem.update({
    where: { id },
    data: { published: !existing.published },
  });
  return mapItem(item);
}

async function uniqueItemSlug(
  collectionId: string,
  base: string,
  ignoreId?: string
): Promise<string> {
  let candidate = base || `item-${Date.now()}`;
  let n = 1;
  // Loop until the slug is free within this collection.
  while (true) {
    const clash = await prisma.cmsItem.findFirst({
      where: { collectionId, slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// ── Pages & bindings ─────────────────────────────────────────

export async function listPages(): Promise<CMSPage[]> {
  const pages = await prisma.cmsPage.findMany({
    include: { bindings: true },
    orderBy: { createdAt: "desc" },
  });
  return pages.map(mapPage);
}

export async function registerPage(input: {
  collectionId: string;
  pageType: CMSPageType;
  framerPageId: string;
  route: string;
  template?: string;
  repeatLayerId?: string;
}): Promise<CMSPage> {
  const collection = await prisma.cmsCollection.findUnique({ where: { id: input.collectionId } });
  if (!collection) throw new NotFoundError("Collection not found");

  const page = await prisma.cmsPage.create({
    data: {
      collectionId: input.collectionId,
      pageType: input.pageType,
      framerPageId: input.framerPageId,
      route: input.route,
      template: input.template ?? "",
      repeatLayerId: input.repeatLayerId ?? null,
    },
    include: { bindings: true },
  });
  return mapPage(page);
}

export async function savePageBindings(
  pageId: string,
  bindings: CMSBinding[]
): Promise<CMSPage> {
  const page = await prisma.cmsPage.findUnique({ where: { id: pageId } });
  if (!page) throw new NotFoundError("Page not found");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.cmsBinding.deleteMany({ where: { pageId } });
    if (bindings.length > 0) {
      await tx.cmsBinding.createMany({
        data: bindings.map((b) => ({
          pageId,
          layerId: b.layerId,
          layerType: b.layerType,
          collectionId: b.collectionId,
          fieldKey: b.fieldKey,
          pageType: b.pageType,
        })),
      });
    }
    return tx.cmsPage.findUnique({ where: { id: pageId }, include: { bindings: true } });
  });

  return mapPage(updated!);
}

export async function getItemBySlug(
  collectionSlug: string,
  itemSlug: string
): Promise<CMSItem | null> {
  const collection = await prisma.cmsCollection.findUnique({ where: { slug: collectionSlug } });
  if (!collection) return null;
  const item = await prisma.cmsItem.findFirst({
    where: { collectionId: collection.id, slug: itemSlug },
  });
  return item ? mapItem(item) : null;
}

// ── Public content readers (used by generated CMS pages) ─────

/** Get items for a collection by its slug — used by generated index pages. */
export async function getCMSItems(
  collectionSlug: string,
  options: { published?: boolean } = {}
): Promise<CMSItem[]> {
  const collection = await prisma.cmsCollection.findUnique({ where: { slug: collectionSlug } });
  if (!collection) return [];
  const items = await prisma.cmsItem.findMany({
    where: {
      collectionId: collection.id,
      ...(options.published !== undefined ? { published: options.published } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return items.map(mapItem);
}

/** Get a single item by collection slug + item slug — used by generated detail pages. */
export async function getCMSItem(
  collectionSlug: string,
  itemSlug: string
): Promise<CMSItem | null> {
  return getItemBySlug(collectionSlug, itemSlug);
}

/** Load a page with its bindings + parent collection (used by code generation). */
export async function getPageForCodegen(pageId: string) {
  const page = await prisma.cmsPage.findUnique({
    where: { id: pageId },
    include: { bindings: true, collection: { include: { fields: true } } },
  });
  if (!page) throw new NotFoundError("Page not found");
  return page;
}
