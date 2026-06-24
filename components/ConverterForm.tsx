"use client";

import { useState } from "react";
import styles from "./ConverterForm.module.css";

type Status = "idle" | "converting" | "preview" | "error";

interface ConvertStats {
  pages: number;
  assets: number;
  cssSize: number;
}

export default function ConverterForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<ConvertStats | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [siteName, setSiteName] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("converting");
    setError("");
    setStats(null);
    setPreviewId(null);
    setTitle("");
    setSiteName("");

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.hint || "Conversion failed");
      }

      setStats(data.stats);
      setPreviewId(data.previewId);
      setTitle(data.title);
      setSiteName(data.siteName);
      setStatus("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function handleDownload() {
    if (!previewId) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/download/${previewId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Download failed");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${siteName || "framer"}-nextjs.zip`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
      setStatus("error");
    } finally {
      setDownloading(false);
    }
  }

  const showPreview = status === "preview" && previewId;

  return (
    <div className={`${styles.converter} ${showPreview ? styles.expanded : ""}`}>
      <form onSubmit={handleConvert} className={styles.converterForm}>
        <div className={styles.inputGroup}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yoursite.framer.website"
            className={styles.urlInput}
            disabled={status === "converting"}
            required
          />
          <button
            type="submit"
            className={styles.convertBtn}
            disabled={status === "converting" || !url.trim()}
          >
            {status === "converting" ? (
              <>
                <span className={styles.spinner} />
                Converting…
              </>
            ) : (
              "Preview Site"
            )}
          </button>
        </div>
      </form>

      {status === "converting" && (
        <div className={styles.statusCard}>
          <div className={styles.statusSteps}>
            <div className={`${styles.step} ${styles.active}`}>Fetching Framer site</div>
            <div className={`${styles.step} ${styles.active}`}>Extracting styles &amp; HTML</div>
            <div className={styles.step}>Downloading assets</div>
            <div className={styles.step}>Generating Next.js project</div>
          </div>
        </div>
      )}

      {showPreview && stats && (
        <div className={styles.previewSection}>
          <div className={`${styles.statusCard} ${styles.success}`}>
            <div className={styles.statusIcon}>✓</div>
            <div className={styles.previewHeader}>
              <p className={styles.statusTitle}>
                {title ? `Preview: ${title}` : "Preview ready"}
              </p>
              <p className={styles.statusDetail}>
                {stats.pages} page{stats.pages !== 1 ? "s" : ""} · {stats.assets} asset
                {stats.assets !== 1 ? "s" : ""} · {(stats.cssSize / 1024).toFixed(0)} KB CSS
              </p>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <span className={styles.spinner} />
                      Downloading…
                    </>
                  ) : (
                    "Download Next.js Project"
                  )}
                </button>
                <a
                  href={`/api/preview/${previewId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.openTabLink}
                >
                  Open in new tab
                </a>
              </div>
            </div>
          </div>

          <div className={styles.previewFrameWrap}>
            <div className={styles.previewFrameHeader}>
              <span className={styles.previewDot} />
              <span className={styles.previewDot} />
              <span className={styles.previewDot} />
              <span className={styles.previewUrl}>Live preview</span>
            </div>
            <iframe
              src={`/api/preview/${previewId}`}
              title="Converted site preview"
              className={styles.previewFrame}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}

      {status === "error" && (
        <div className={`${styles.statusCard} ${styles.error}`}>
          <div className={styles.statusIcon}>✕</div>
          <div>
            <p className={styles.statusTitle}>Conversion failed</p>
            <p className={styles.statusDetail}>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}