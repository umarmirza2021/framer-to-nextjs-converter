"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cms, type CollectionWithCount } from "@/lib/cms/fetch";
import type { CMSPage } from "@/lib/cms/types";
import styles from "@/components/admin/admin.module.css";

export default function AdminDashboard() {
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([cms.listCollections(), cms.listPages()])
      .then(([c, p]) => {
        setCollections(c);
        setPages(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalItems = collections.reduce((n, c) => n + c.itemCount, 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Dashboard</div>
          <div className={styles.subtitle}>Overview of your content</div>
        </div>
        <Link href="/admin/collections/new" className={styles.btn}>
          + New collection
        </Link>
      </div>

      {loading ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : (
        <>
          <div className={styles.grid} style={{ marginBottom: 24 }}>
            <div className={styles.card}>
              <div className={styles.cardNum}>{collections.length}</div>
              <div className={styles.cardMeta}>Collections</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardNum}>{totalItems}</div>
              <div className={styles.cardMeta}>Content items</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardNum}>{pages.length}</div>
              <div className={styles.cardMeta}>CMS pages</div>
            </div>
          </div>

          <div className={styles.title} style={{ fontSize: 16, marginBottom: 12 }}>
            Collections
          </div>
          {collections.length === 0 ? (
            <p className={styles.empty}>
              No collections yet. Create one to start adding content.
            </p>
          ) : (
            <div className={styles.grid}>
              {collections.map((c) => (
                <Link key={c.id} href={`/admin/content/${c.id}`} className={styles.card}>
                  <div className={styles.cardTitle}>{c.name}</div>
                  <div className={styles.cardMeta}>
                    {c.itemCount} item{c.itemCount !== 1 ? "s" : ""} · {c.fields.length} fields
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
