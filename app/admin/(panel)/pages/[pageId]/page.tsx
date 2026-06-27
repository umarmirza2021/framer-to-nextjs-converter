import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { extractLayers } from "@/lib/cms/bindings";
import BindingEditor from "@/components/admin/BindingEditor";
import type {
  CMSBinding,
  CMSField,
  CMSFieldType,
  CMSLayerType,
  CMSPageType,
} from "@/lib/cms/types";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export default async function PageBindingsPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const page = await prisma.cmsPage.findUnique({
    where: { id: pageId },
    include: {
      bindings: true,
      collection: { include: { fields: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!page) notFound();

  const layers = extractLayers(page.template);

  const fields: CMSField[] = page.collection.fields.map((f) => ({
    id: f.id,
    name: f.name,
    key: f.key,
    type: f.type as CMSFieldType,
    required: f.required,
    defaultValue: f.defaultValue ?? undefined,
  }));

  const initialBindings: CMSBinding[] = page.bindings.map((b) => ({
    layerId: b.layerId,
    layerType: b.layerType as CMSLayerType,
    collectionId: b.collectionId,
    fieldKey: b.fieldKey,
    pageType: b.pageType as CMSPageType,
  }));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Bindings · {page.route}</div>
          <div className={styles.subtitle}>
            {page.pageType} page → {page.collection.name}
          </div>
        </div>
      </div>

      <BindingEditor
        pageId={page.id}
        collectionId={page.collectionId}
        pageType={page.pageType as CMSPageType}
        fields={fields}
        layers={layers}
        initialBindings={initialBindings}
      />
    </div>
  );
}
