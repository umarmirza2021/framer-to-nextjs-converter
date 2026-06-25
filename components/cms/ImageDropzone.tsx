"use client";

import { useCallback, useState } from "react";
import styles from "./cms.module.css";

interface ImageDropzoneProps {
  value: { url?: string; alt?: string; name?: string };
  onChange: (value: { url: string; alt?: string; name?: string }) => void;
  accept?: "image" | "file";
  label?: string;
}

export default function ImageDropzone({
  value,
  onChange,
  accept = "image",
  label = "Drop image here or click to upload",
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        onChange({
          url: data.url,
          alt: value.alt || file.name,
          name: file.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, value.alt]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  const isImage = accept === "image" && value.url && !value.url.endsWith(".pdf");

  return (
    <div className={styles.dropzoneWrap}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isImage ? (
          <img src={value.url} alt={value.alt || "Preview"} className={styles.dropzonePreview} />
        ) : value.url ? (
          <p className={styles.dropzoneFileName}>{value.name || value.url}</p>
        ) : (
          <p className={styles.dropzoneLabel}>{uploading ? "Uploading…" : label}</p>
        )}
        <input
          type="file"
          accept={accept === "image" ? "image/*" : "image/*,.pdf"}
          className={styles.dropzoneInput}
          onChange={handleFileInput}
          disabled={uploading}
        />
      </div>
      <input
        className={styles.input}
        type="text"
        placeholder="Alt text (optional)"
        value={value.alt || ""}
        onChange={(e) => onChange({ ...value, url: value.url || "", alt: e.target.value })}
        style={{ marginTop: 8 }}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}