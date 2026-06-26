"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";


type Status = "idle" | "converting" | "preview" | "error";

interface ConvertStats {
  pages: number;
  assets: number;
  cssSize: number;
}

export default function ConverterForm() {
  const { data: session } = useSession();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<ConvertStats | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [siteName, setSiteName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("converting");
    setError("");
    setStats(null);
    setPreviewId(null);
    setTitle("");
    setSiteName("");
    setSavedProjectId(null);
    setSaveMessage("");

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const raw = await response.text();
      let data: {
        error?: string;
        hint?: string;
        previewId?: string;
        stats?: ConvertStats;
        title?: string;
        siteName?: string;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 200);
        if (response.status === 504 || /inactivity timeout/i.test(snippet)) {
          throw new Error(
            "Conversion timed out. Large sites can take a while — please try again."
          );
        }
        if (response.status === 502 || response.status === 503) {
          throw new Error("Server is temporarily unavailable. Please try again in a moment.");
        }
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
      setStatus("preview");

      if (session?.user) {
        try {
          const saveRes = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              framerUrl: url.trim(),
              previewId: data.previewId,
              title: data.title,
              siteName: data.siteName,
              stats: data.stats,
            }),
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.project?.id) {
            setSavedProjectId(saveData.project.id);
            setSaveMessage("Saved to your dashboard");
          }
        } catch {
          setSaveMessage("Preview ready — could not save to dashboard");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function handleDownload() {
    if (!previewId) return;

    setDownloading(true);
    setDownloadError("");
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
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const showPreview = status === "preview" && previewId;

  return (
    <div className={`ftn-converter${showPreview ? " ftn-converter--expanded" : ""}`}>
      <form onSubmit={handleConvert} className="ftn-converter-form">
        <div className="ftn-input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yoursite.framer.website"
            className="ftn-url-input"
            disabled={status === "converting"}
            required
          />
          <button
            type="submit"
            className="ftn-convert-btn"
            disabled={status === "converting" || !url.trim()}
          >
            {status === "converting" ? (
              <>
                <span className="ftn-spinner" />
                Converting…
              </>
            ) : (
              "Preview Site"
            )}
          </button>
        </div>
      </form>

      {status === "converting" && (
        <div className="ftn-status-card">
          <div className="ftn-status-steps">
            <div className="ftn-step ftn-step--active">Fetching Framer site</div>
            <div className="ftn-step ftn-step--active">Extracting styles &amp; HTML</div>
            <div className="ftn-step">Downloading assets</div>
            <div className="ftn-step">Generating Next.js project</div>
          </div>
        </div>
      )}

      {showPreview && stats && (
        <div className="ftn-preview-section">
          <div className="ftn-status-card ftn-status-card--success">
            <div className="ftn-status-icon">✓</div>
            <div className="ftn-preview-header">
              <p className="ftn-status-title">
                {title ? `Preview: ${title}` : "Preview ready"}
              </p>
              <p className="ftn-status-detail">
                {stats.pages} page{stats.pages !== 1 ? "s" : ""} · {stats.assets} asset
                {stats.assets !== 1 ? "s" : ""} · {(stats.cssSize / 1024).toFixed(0)} KB CSS
                {saveMessage && (
                  <>
                    {" "}
                    · <span className="ftn-saved-badge">{saveMessage}</span>
                  </>
                )}
              </p>
              {savedProjectId && (
                <p className="ftn-dashboard-link">
                  <Link href={`/dashboard/projects/${savedProjectId}`}>
                    View in dashboard →
                  </Link>
                </p>
              )}
              <div className="ftn-preview-actions">
                <button
                  type="button"
                  className="ftn-download-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <span className="ftn-spinner" />
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
                  className="ftn-open-tab-link"
                >
                  Open in new tab
                </a>
              </div>
              {downloadError && (
                <p className="ftn-download-error">{downloadError}</p>
              )}
            </div>
          </div>

          <div className="ftn-preview-frame-wrap">
            <div className="ftn-preview-frame-header">
              <span className="ftn-preview-dot" />
              <span className="ftn-preview-dot" />
              <span className="ftn-preview-dot" />
              <span className="ftn-preview-url">Live preview</span>
            </div>
            <iframe
              src={`/api/preview/${previewId}`}
              title="Converted site preview"
              className="ftn-preview-frame"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ftn-status-card ftn-status-card--error">
          <div className="ftn-status-icon">✕</div>
          <div>
            <p className="ftn-status-title">Conversion failed</p>
            <p className="ftn-status-detail">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}