"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./cms.module.css";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface CmsCollectionsPageProps {
  projectId: string;
  projectTitle: string;
  collections: {
    id: string;
    name: string;
    slug: string;
    _count: { fields: number; entries: number };
  }[];
}

export default function CmsCollectionsPage({
  projectId,
  projectTitle,
  collections: initial,
}: CmsCollectionsPageProps) {
  const router = useRouter();
  const [collections, setCollections] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/projects/${projectId}/cms/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create collection");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/projects/${projectId}/cms/${data.collection.id}`);
  }

  return (
    <main className={dashStyles.dashboard}>
      <Link href={`/dashboard/projects/${projectId}`} className={dashStyles.backLink}>
        ← Back to project
      </Link>

      <div className={styles.tabs}>
        <Link href={`/dashboard/projects/${projectId}`} className={styles.tab}>
          Preview
        </Link>
        <Link
          href={`/dashboard/projects/${projectId}/cms`}
          className={`${styles.tab} ${styles.tabActive}`}
        >
          CMS
        </Link>
      </div>

      <h1 className={dashStyles.title}>CMS — {projectTitle}</h1>
      <p className={dashStyles.subtitle}>
        Collections are auto-detected when you convert a site. Edit fields and content below.
      </p>

      {collections.length > 0 && (
        <div className={styles.autoDetectBanner}>
          ✓ {collections.length} collection{collections.length !== 1 ? "s" : ""} imported from your
          Framer site — add more fields or entries anytime.
        </div>
      )}

      {collections.length > 0 && (
        <div className={dashStyles.grid} style={{ marginBottom: 24 }}>
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/projects/${projectId}/cms/${c.id}`}
              className={dashStyles.card}
            >
              <h3 className={dashStyles.cardTitle}>{c.name}</h3>
              <p className={dashStyles.cardStats}>
                {c._count.fields} fields · {c._count.entries} entries
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.panel} style={{ maxWidth: 480 }}>
        <h2 className={styles.panelTitle}>New collection</h2>
        <form onSubmit={createCollection}>
          <input
            className={styles.input}
            placeholder="Collection name (e.g. Blog Posts)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={dashStyles.actionBtn + " " + dashStyles.primary}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            {loading ? "Creating…" : "Create collection"}
          </button>
        </form>
      </div>
    </main>
  );
}