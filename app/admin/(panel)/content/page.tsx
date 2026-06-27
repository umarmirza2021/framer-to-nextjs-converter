"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cms, type CollectionWithCount } from "@/lib/cms/fetch";
import styles from "@/components/admin/admin.module.css";

export default function ContentHome() {
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cms.listCollections().then(setCollections).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Content</div>
          <div className={styles.subtitle}>Pick a collection to edit its items</div>
        </div>
      </div>

      {loading ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : collections.length === 0 ? (
        <p className={styles.empty}>
          No collections yet. Create one under Collections first.
        </p>
      ) : (
        <div className={styles.grid}>
          {collections.map((c) => (
            <Link key={c.id} href={`/admin/content/${c.id}`} className={styles.card}>
              <div className={styles.cardTitle}>{c.name}</div>
              <div className={styles.cardMeta}>
                {c.itemCount} item{c.itemCount !== 1 ? "s" : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
