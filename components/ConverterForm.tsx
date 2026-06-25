"use client";

import { useState } from "react";
import styles from "./ConverterForm.module.css";

type Status = "idle" | "converting" | "preview" | "error";
type Platform = "auto" | "framer" | "webflow";

interface ConvertStats {
  pages: number;
  assets: number;
  cssSize: number;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  auto: "Auto-detect",
  framer: "Framer",
  webflow: "Webflow",
};

const PLATFORM_PLACEHOLDERS: Record<Platform, string> = {
  auto: "yoursite.com or yoursite.framer.website",
  framer: "yoursite.framer.website",
  webflow: "www.yoursite.com",
};

export default function ConverterForm() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("auto");
  const [detectedPlatform, setDetectedPlatform] = useState<string>("");
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
    setDetectedPlatform("");

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), platform }),
      });

      const raw = await response.text();
      let data: {
        error?: string;
        hint?: string;
        previewId?: string;
        stats?: ConvertStats;
        title?: string;
        siteName?: string;
        platform?: string;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 120);
        throw new Error(
          response.ok
            ? "Server returned an invalid response. Try again."
            : `Server error (${response.status}): ${snippet || "non-JSON response"}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.hint || "Conversion failed");
      }

      if (!data.previewId || !data.stats) {
        throw new Error("Server returned an incomplete response. Try again.");
      }

      setStats(data.stats);
      setPreviewId(data.previewId);
      setTitle(data.title || "");
      setSiteName(data.siteName || "");
      setDetectedPlatform(data.platform || "");
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
        const raw = await response.text();
        let message = "Download failed";
        try {
          const data = JSON.parse(raw) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 120);
          message = `Download failed (${response.status}): ${snippet || "unknown error"}`;
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${siteName || "site"}-nextjs.zip`;

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
  const platformName =
    platform === "auto"
      ? detectedPlatform || "site"
      : platform;

  return (
    <div className={`${styles.converter} ${showPreview ? styles.expanded : ""}`}>
      <form onSubmit={handleConvert} className={styles.converterForm}>
        <div className={styles.platformTabs}>
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.platformTab} ${platform === key ? styles.platformTabActive : ""}`}
              onClick={() => setPlatform(key)}
              disabled={status === "converting"}
            >
              {PLATFORM_LABELS[key]}
            </button>
          ))}
        </div>

        <div className={styles.inputGroup}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={PLATFORM_PLACEHOLDERS[platform]}
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
            <div className={`${styles.step} ${styles.active}`}>
              Fetching {platform === "webflow" ? "Webflow" : platform === "framer" ? "Framer" : ""} site
            </div>
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
                {detectedPlatform && (
                  <span className={styles.platformBadge}>{detectedPlatform}</span>
                )}
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
              <span className={styles.previewUrl}>Live preview · {platformName}</span>
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