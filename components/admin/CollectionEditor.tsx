"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cms } from "@/lib/cms/fetch";
import type { CMSCollection } from "@/lib/cms/types";
import FieldBuilder, { type DraftField } from "./FieldBuilder";
import styles from "./admin.module.css";

export default function CollectionEditor({
  existing,
}: {
  existing?: CMSCollection;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [fields, setFields] = useState<DraftField[]>(
    existing?.fields.map((f) => ({
      name: f.name,
      key: f.key,
      type: f.type,
      required: f.required,
    })) ?? [{ name: "Title", type: "text", required: true }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    if (!name.trim()) return setError("Collection name is required.");
    if (fields.some((f) => !f.name.trim()))
      return setError("Every field needs a name.");

    setSaving(true);
    try {
      const payload = { name: name.trim(), fields };
      if (existing) {
        await cms.updateCollection(existing.id, payload);
      } else {
        await cms.createCollection(payload);
      }
      router.push("/admin/collections");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <label className={styles.label}>Collection name</label>
      <input
        className={styles.input}
        placeholder="e.g. Blog Posts"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className={styles.label} style={{ marginTop: 20 }}>
        Fields
      </label>
      <FieldBuilder fields={fields} onChange={setFields} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row} style={{ marginTop: 20 }}>
        <button className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : existing ? "Save changes" : "Create collection"}
        </button>
        <button
          className={styles.btnGhost}
          onClick={() => router.push("/admin/collections")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
