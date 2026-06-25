"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/dashboard/dashboard.module.css";

interface ProjectActionsProps {
  projectId: string;
  siteName: string;
}

export default function ProjectActions({ projectId, siteName }: ProjectActionsProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${siteName}-nextjs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/dashboard");
      router.refresh();
    } catch {
      alert("Could not delete project.");
      setDeleting(false);
    }
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.primary}`}
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? "Downloading…" : "Download zip"}
      </button>
      <a
        href={`/api/projects/${projectId}/preview`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.actionBtn} ${styles.secondary}`}
      >
        Open preview
      </a>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.danger}`}
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}