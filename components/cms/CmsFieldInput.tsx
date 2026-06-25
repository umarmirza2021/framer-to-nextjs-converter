"use client";

import { useState } from "react";
import { coerceFieldValue } from "@/lib/cms/entry-values";
import type { CmsFieldType } from "@/lib/cms/types";
import ImageDropzone from "./ImageDropzone";
import styles from "./cms.module.css";

interface CmsField {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  options: string[] | null;
  refCollectionId: string | null;
}

interface CmsFieldInputProps {
  field: CmsField;
  value: unknown;
  onChange: (value: unknown) => void;
  allCollections?: { id: string; name: string }[];
}

export default function CmsFieldInput({
  field,
  value,
  onChange,
  allCollections = [],
}: CmsFieldInputProps) {
  const type = field.type as CmsFieldType;
  const fieldValue = coerceFieldValue(type, value);

  if (type === "DIVIDER") {
    return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />;
  }

  const label = (
    <label className={styles.fieldLabel}>
      {field.name}
      {field.required && " *"}
    </label>
  );

  switch (type) {
    case "PLAIN_TEXT":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <input
            className={styles.input}
            type="text"
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "FORMATTED_TEXT":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <textarea
            className={styles.textarea}
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "DATE":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <input
            className={styles.input}
            type="date"
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "LINK": {
      const link = (fieldValue as { url?: string; text?: string }) || {};
      return (
        <div className={styles.fieldGroup}>
          {label}
          <input
            className={styles.input}
            type="url"
            placeholder="URL"
            value={link.url || ""}
            onChange={(e) => onChange({ ...link, url: e.target.value })}
            style={{ marginBottom: 8 }}
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Link text"
            value={link.text || ""}
            onChange={(e) => onChange({ ...link, text: e.target.value })}
          />
        </div>
      );
    }

    case "IMAGE": {
      const img = (fieldValue as { url?: string; alt?: string }) || {};
      return (
        <div className={styles.fieldGroup}>
          {label}
          <ImageDropzone
            value={img}
            onChange={(v) => onChange(v)}
            label="Drop image here or click to upload"
          />
          <input
            className={styles.input}
            type="url"
            placeholder="Or paste image URL"
            value={img.url || ""}
            onChange={(e) => onChange({ ...img, url: e.target.value })}
            style={{ marginTop: 8 }}
          />
        </div>
      );
    }

    case "GALLERY": {
      const images = Array.isArray(fieldValue) ? (fieldValue as string[]) : [];
      return (
        <div className={styles.fieldGroup}>
          {label}
          <GalleryDropzone
            images={images}
            onChange={onChange}
          />
          <textarea
            className={styles.textarea}
            placeholder="Or paste image URLs (one per line)"
            value={images.join("\n")}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            style={{ marginTop: 8 }}
          />
        </div>
      );
    }

    case "COLOR":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <input
            className={styles.input}
            type="color"
            value={(fieldValue as string) || "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "TOGGLE":
      return (
        <div className={styles.fieldGroup}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={!!fieldValue}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className={styles.fieldLabel} style={{ margin: 0 }}>
              {field.name}
            </span>
          </label>
        </div>
      );

    case "NUMBER":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <input
            className={styles.input}
            type="number"
            value={typeof fieldValue === "number" ? fieldValue : ""}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );

    case "OPTION":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <select
            className={styles.select}
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "FILE": {
      const file = (fieldValue as { url?: string; name?: string }) || {};
      return (
        <div className={styles.fieldGroup}>
          {label}
          <ImageDropzone
            value={file}
            onChange={(v) => onChange({ url: v.url, name: v.name || v.alt })}
            accept="file"
            label="Drop file here or click to upload"
          />
          <input
            className={styles.input}
            type="url"
            placeholder="Or paste file URL"
            value={file.url || ""}
            onChange={(e) => onChange({ ...file, url: e.target.value })}
            style={{ marginTop: 8 }}
          />
        </div>
      );
    }

    case "VECTOR_SET":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <textarea
            className={styles.textarea}
            placeholder="One SVG/icon URL per line"
            value={Array.isArray(fieldValue) ? (fieldValue as string[]).join("\n") : ""}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      );

    case "REFERENCE":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <select
            className={styles.select}
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">None</option>
            {allCollections
              .filter((c) => c.id === field.refCollectionId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (entry ref)
                </option>
              ))}
          </select>
          <input
            className={styles.input}
            type="text"
            placeholder="Referenced entry ID"
            value={(fieldValue as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
      );

    case "MULTI_REFERENCE":
      return (
        <div className={styles.fieldGroup}>
          {label}
          <textarea
            className={styles.textarea}
            placeholder="One entry ID per line"
            value={Array.isArray(fieldValue) ? (fieldValue as string[]).join("\n") : ""}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}

function GalleryDropzone({
  images,
  onChange,
}: {
  images: string[];
  onChange: (value: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(fileList: FileList | File[]) {
    setUploading(true);
    const files = Array.from(fileList);
    const urls: string[] = [...images];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) urls.push(data.url);
    }

    onChange(urls);
    setUploading(false);
  }

  return (
    <div
      className={styles.galleryDropzone}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
      }}
    >
      <div className={styles.galleryGrid}>
        {images.map((url) => (
          <div key={url} className={styles.galleryThumb}>
            <img src={url} alt="" />
            <button
              type="button"
              className={styles.galleryRemove}
              onClick={() => onChange(images.filter((u) => u !== url))}
            >
              ×
            </button>
          </div>
        ))}
        <label className={styles.galleryAdd}>
          {uploading ? "…" : "+"}
          <input
            type="file"
            accept="image/*"
            multiple
            className={styles.dropzoneInput}
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>
      <p className={styles.dropzoneHint}>Drag & drop images here</p>
    </div>
  );
}

