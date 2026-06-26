"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";

export default function MediaLibrary() {
  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/cms/media")
      .then((r) => r.json())
      .then((d) => setMedia(d.media ?? []));
  }
  useEffect(load, []);

  async function upload(file: File) {
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/cms/media", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setMessage("Uploaded.");
      load();
    } else {
      setMessage(data.error || "Upload failed.");
    }
  }

  function copy(url: string) {
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    setMessage(`Copied: ${full}`);
  }

  return (
    <div>
      <div className={styles.panel}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <button
          className={styles.btn}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        {message && <p className={styles.success}>{message}</p>}
      </div>

      {media.length === 0 ? (
        <p className={styles.empty}>No media yet. Upload your first image.</p>
      ) : (
        <div className={styles.grid}>
          {media.map((url) => (
            <div key={url} className={styles.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
              />
              <button
                className={styles.btnGhost}
                style={{ marginTop: 8, width: "100%" }}
                onClick={() => copy(url)}
              >
                Copy URL
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
