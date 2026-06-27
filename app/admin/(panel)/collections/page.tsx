"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cms, type CollectionWithCount } from "@/lib/cms/fetch";
import styles from "@/components/admin/admin.module.css";

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    cms.listCollections().then(setCollections).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its items? This cannot be undone.`)) return;
    await cms.deleteCollection(id);
    load();
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Collections</div>
          <div className={styles.subtitle}>Define the structure of your content</div>
        </div>
        <Link href="/admin/collections/new" className={styles.btn}>
          + New collection
        </Link>
      </div>

      {loading ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : collections.length === 0 ? (
        <p className={styles.empty}>No collections yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Fields</th>
              <th>Items</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/content/${c.id}`} className={styles.rowLink}>
                    {c.name}
                  </Link>
                </td>
                <td style={{ color: "#8a909c" }}>{c.slug}</td>
                <td>{c.fields.length}</td>
                <td>{c.itemCount}</td>
                <td>
                  <div className={styles.row} style={{ justifyContent: "flex-end" }}>
                    <button
                      className={styles.btnGhost}
                      onClick={() => router.push(`/admin/collections/${c.id}`)}
                    >
                      Edit
                    </button>
                    <button className={styles.btnDanger} onClick={() => remove(c.id, c.name)}>
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
