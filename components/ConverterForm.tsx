"use client";

import { useState } from "react";
import styles from "./ConverterForm.module.css";

type Status = "idle" | "converting" | "success" | "error";

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

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("converting");
    setError("");
    setStats(null);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.hint || "Conversion failed");
      }

      const blob = await response.blob();
      const pages = response.headers.get("X-Pages-Converted");
      const assets = response.headers.get("X-Assets-Downloaded");
      const cssSize = response.headers.get("X-CSS-Size");

      setStats({
        pages: pages ? parseInt(pages, 10) : 1,
        assets: assets ? parseInt(assets, 10) : 0,
        cssSize: cssSize ? parseInt(cssSize, 10) : 0,
      });

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "framer-nextjs.zip";

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className={styles.converter}>
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
              "Convert to Next.js"
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

      {status === "success" && stats && (
        <div className={`${styles.statusCard} ${styles.success}`}>
          <div className={styles.statusIcon}>✓</div>
          <div>
            <p className={styles.statusTitle}>Conversion complete!</p>
            <p className={styles.statusDetail}>
              {stats.pages} page{stats.pages !== 1 ? "s" : ""} · {stats.assets} asset
              {stats.assets !== 1 ? "s" : ""} · {(stats.cssSize / 1024).toFixed(0)} KB CSS
            </p>
            <p className={styles.statusHint}>
              Zip downloaded to your Downloads folder. Unzip it, then deploy:
            </p>
            <p className={styles.statusHint}>
              <code>npm install</code> → <code>npm run dev</code> (local) or push to Vercel/Netlify
            </p>
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