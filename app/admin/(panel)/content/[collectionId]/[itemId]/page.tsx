"use client";

import { use, useEffect, useState } from "react";
import { cms } from "@/lib/cms/fetch";
import type { CMSCollection, CMSItem } from "@/lib/cms/types";
import ItemEditor from "@/components/admin/ItemEditor";
import styles from "@/components/admin/admin.module.css";

export default function ItemEditorPage({
  params,
}: {
  params: Promise<{ collectionId: string; itemId: string }>;
}) {
  const { collectionId, itemId } = use(params);
  const isNew = itemId === "new";
  const [collection, setCollection] = useState<CMSCollection | null>(null);
  const [item, setItem] = useState<CMSItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tasks: Promise<unknown>[] = [cms.getCollection(collectionId).then(setCollection)];
    if (!isNew) tasks.push(cms.getItem(itemId).then(setItem));
    Promise.all(tasks).finally(() => setLoading(false));
  }, [collectionId, itemId, isNew]);

  if (loading) return <p className={styles.subtitle}>Loading…</p>;
  if (!collection) return <p className={styles.empty}>Collection not found.</p>;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>
            {isNew ? "New item" : "Edit item"} · {collection.name}
          </div>
        </div>
      </div>
      <ItemEditor collection={collection} item={item} />
    </div>
  );
}
