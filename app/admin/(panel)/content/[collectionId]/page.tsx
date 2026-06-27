"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { cms } from "@/lib/cms/fetch";
import type { CMSCollection, CMSItem } from "@/lib/cms/types";
import styles from "@/components/admin/admin.module.css";

export default function CollectionItemsPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  const { collectionId } = use(params);
  const [collection, setCollection] = useState<CMSCollection | null>(null);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([cms.getCollection(collectionId), cms.listItems(collectionId)])
      .then(([c, res]) => {
        setCollection(c);
        setItems(res.items);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [collectionId]);

  async function togglePublish(item: CMSItem) {
    await cms.publishItem(item.id);
    load();
  }
  async function remove(item: CMSItem) {
    if (!confirm("Delete this item?")) return;
    await cms.deleteItem(item.id);
    load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;
  if (!collection) return <p className={styles.empty}>Collection not found.</p>;

  const previewFields = collection.fields.slice(0, 3);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{collection.name}</div>
          <div className={styles.subtitle}>{items.length} items</div>
        </div>
        <Link href={`/admin/content/${collectionId}/new`} className={styles.btn}>
          + New item
        </Link>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>No items yet. Create your first one.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {previewFields.map((f) => (
                <th key={f.id}>{f.name}</th>
              ))}
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {previewFields.map((f, idx) => (
                  <td key={f.id}>
                    {idx === 0 ? (
                      <Link
                        href={`/admin/content/${collectionId}/${item.id}`}
                        className={styles.rowLink}
                      >
                        {formatCell(item.data[f.key]) || "(untitled)"}
                      </Link>
                    ) : (
                      formatCell(item.data[f.key])
                    )}
                  </td>
                ))}
                <td>
                  <span
                    className={`${styles.badge} ${item.published ? styles.badgeOn : styles.badgeOff}`}
                  >
                    {item.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td>
                  <div className={styles.row} style={{ justifyContent: "flex-end" }}>
                    <button className={styles.btnGhost} onClick={() => togglePublish(item)}>
                      {item.published ? "Unpublish" : "Publish"}
                    </button>
                    <button className={styles.btnDanger} onClick={() => remove(item)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str.length > 60 ? str.slice(0, 60) + "…" : str;
}
