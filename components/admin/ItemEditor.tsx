"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cms } from "@/lib/cms/fetch";
import type { CMSCollection, CMSField, CMSItem } from "@/lib/cms/types";
import styles from "./admin.module.css";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CMSField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = value == null ? "" : String(value);
  switch (field.type) {
    case "rich-text":
      // Interim: plain HTML/markdown textarea. Upgraded to TipTap in polish stage.
      return (
        <textarea
          className={styles.textarea}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <label className={styles.row} style={{ color: "#aeb3bf", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.name}
        </label>
      );
    case "number":
      return (
        <input
          className={styles.input}
          type="number"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          className={styles.input}
          type="date"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "color":
      return (
        <input
          className={styles.input}
          type="color"
          value={str || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: 40, padding: 4 }}
        />
      );
    case "image":
      return (
        <div>
          <input
            className={styles.input}
            type="url"
            placeholder="https://… (or paste from Media)"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {str && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={str}
              alt=""
              style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, border: "1px solid #262a33" }}
            />
          )}
        </div>
      );
    case "url":
      return (
        <input
          className={styles.input}
          type="url"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          className={styles.input}
          type="text"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default function ItemEditor({
  collection,
  item,
}: {
  collection: CMSCollection;
  item: CMSItem | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown>>(item?.data ?? {});
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [published, setPublished] = useState(item?.published ?? false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key: string, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save(publish: boolean) {
    setError("");
    setSaving(true);
    try {
      const payload = { slug: slug || undefined, data, published: publish };
      if (item) {
        await cms.updateItem(item.id, payload);
      } else {
        await cms.createItem(collection.id, payload);
      }
      router.push(`/admin/content/${collection.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirm("Delete this item permanently?")) return;
    await cms.deleteItem(item.id);
    router.push(`/admin/content/${collection.id}`);
    router.refresh();
  }

  return (
    <div className={styles.panel}>
      {collection.fields.map((field) => (
        <div key={field.id}>
          {field.type !== "boolean" && (
            <label className={styles.label}>
              {field.name}
              {field.required && <span style={{ color: "#ff7b8a" }}> *</span>}
            </label>
          )}
          <FieldInput field={field} value={data[field.key]} onChange={(v) => set(field.key, v)} />
        </div>
      ))}

      <label className={styles.label} style={{ marginTop: 18 }}>
        URL slug (auto-generated if blank)
      </label>
      <input
        className={styles.input}
        placeholder="my-first-post"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row} style={{ marginTop: 20, justifyContent: "space-between" }}>
        <div className={styles.row}>
          <button className={styles.btn} onClick={() => save(true)} disabled={saving}>
            {published ? "Save & keep published" : "Publish"}
          </button>
          <button className={styles.btnGhost} onClick={() => save(false)} disabled={saving}>
            Save as draft
          </button>
        </div>
        {item && (
          <button className={styles.btnDanger} onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
