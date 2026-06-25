"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getEntryFieldValue, normalizeEntryValues } from "@/lib/cms/entry-values";
import { CMS_FIELD_TYPES } from "@/lib/cms/types";
import CmsFieldInput from "./CmsFieldInput";
import styles from "./cms.module.css";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface CmsField {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  options: string[] | null;
  refCollectionId: string | null;
}

interface CmsEntry {
  id: string;
  slug: string;
  values: Record<string, unknown>;
  published: boolean;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  fields: CmsField[];
  entries: CmsEntry[];
}

interface EntryDraft {
  id: string;
  slug: string;
  values: Record<string, unknown>;
  published: boolean;
}

interface CmsCollectionEditorProps {
  projectId: string;
  collectionId: string;
  collections: { id: string; name: string; slug: string }[];
}

function normalizeEntry(entry: CmsEntry): CmsEntry {
  return {
    ...entry,
    values: normalizeEntryValues(entry.values),
  };
}

export default function CmsCollectionEditor({
  projectId,
  collectionId,
  collections,
}: CmsCollectionEditorProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [optionChoices, setOptionChoices] = useState("");
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);
  const [openingEntryId, setOpeningEntryId] = useState<string | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryMessage, setEntryMessage] = useState("");

  const collectionUrl = `/api/projects/${projectId}/cms/collections/${collectionId}`;
  const entriesUrl = `${collectionUrl}/entries`;

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const res = await fetch(collectionUrl, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");

        const nextCollection = data.collection as Collection;
        nextCollection.entries = nextCollection.entries.map(normalizeEntry);
        setCollection(nextCollection);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [collectionUrl]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function addField(type: string) {
    if (!newFieldName.trim()) {
      setError("Enter a field name first");
      return;
    }

    const body: Record<string, unknown> = {
      name: newFieldName.trim(),
      type,
    };

    if (type === "OPTION" && optionChoices.trim()) {
      body.options = optionChoices.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const res = await fetch(`${collectionUrl}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add field");
      return;
    }

    setNewFieldName("");
    setOptionChoices("");
    setShowFieldPicker(false);
    setError("");
    await load({ silent: !!entryDraft });
  }

  async function deleteField(fieldId: string) {
    if (!confirm("Delete this field?")) return;
    await fetch(`${collectionUrl}/fields/${fieldId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load({ silent: !!entryDraft });
  }

  function closeEntryEditor() {
    setEntryDraft(null);
    setEntryMessage("");
    setOpeningEntryId(null);
  }

  async function openEntryEditor(entryId: string) {
    setOpeningEntryId(entryId);
    setError("");
    setEntryMessage("");

    try {
      const res = await fetch(`${entriesUrl}/${entryId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load entry");
      }

      const entry = normalizeEntry(data.entry as CmsEntry);
      setEntryDraft({
        id: entry.id,
        slug: entry.slug,
        values: { ...entry.values },
        published: entry.published,
      });
      setEntryMessage(`Editing "${entry.slug}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open entry");
      setEntryDraft(null);
    } finally {
      setOpeningEntryId(null);
    }
  }

  async function addEntry() {
    setError("");
    setEntryMessage("");

    const res = await fetch(entriesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ slug: `entry-${Date.now()}`, values: {}, published: false }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create entry");
      return;
    }

    const entry = normalizeEntry(data.entry as CmsEntry);
    setCollection((prev) =>
      prev
        ? {
            ...prev,
            entries: [entry, ...prev.entries.filter((item) => item.id !== entry.id)],
          }
        : prev
    );
    setEntryDraft({
      id: entry.id,
      slug: entry.slug,
      values: { ...entry.values },
      published: entry.published,
    });
    setEntryMessage("New entry created — fill in the fields below and save.");
  }

  function updateDraftValue(fieldSlug: string, value: unknown) {
    setEntryDraft((prev) =>
      prev
        ? {
            ...prev,
            values: {
              ...prev.values,
              [fieldSlug]: value,
            },
          }
        : prev
    );
  }

  function updateDraftMeta(patch: Partial<Pick<EntryDraft, "slug" | "published">>) {
    setEntryDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function saveEntryDraft() {
    if (!entryDraft) return;

    setSavingEntry(true);
    setError("");
    setEntryMessage("");

    const res = await fetch(`${entriesUrl}/${entryDraft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        slug: entryDraft.slug,
        values: entryDraft.values,
        published: entryDraft.published,
      }),
    });

    const data = await res.json();
    setSavingEntry(false);

    if (!res.ok) {
      setError(data.error || "Failed to save entry");
      return;
    }

    const saved = normalizeEntry(data.entry as CmsEntry);
    setEntryDraft({
      id: saved.id,
      slug: saved.slug,
      values: { ...saved.values },
      published: saved.published,
    });
    setCollection((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((item) =>
              item.id === saved.id ? saved : item
            ),
          }
        : prev
    );
    setEntryMessage(`Saved "${saved.slug}".`);
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Delete this entry?")) return;

    const res = await fetch(`${entriesUrl}/${entryId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete entry");
      return;
    }

    if (entryDraft?.id === entryId) {
      closeEntryEditor();
    }

    setCollection((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.filter((item) => item.id !== entryId),
          }
        : prev
    );
    setEntryMessage("Entry deleted.");
  }

  if (loading) {
    return <p className={dashStyles.subtitle}>Loading CMS…</p>;
  }

  if (!collection) {
    return <p className={styles.error}>{error || "Collection not found"}</p>;
  }

  const contentFields = collection.fields.filter((f) => f.type !== "DIVIDER");

  return (
    <div className={styles.cmsLayout}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>Collections</p>
        <ul className={styles.collectionList}>
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/projects/${projectId}/cms/${c.id}`}
                className={`${styles.collectionLink} ${
                  c.id === collectionId ? styles.collectionLinkActive : ""
                }`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{collection.name}</h2>
          <button
            type="button"
            className={dashStyles.actionBtn + " " + dashStyles.primary}
            onClick={addEntry}
          >
            + Add entry
          </button>
        </div>

        <h3 className={styles.sectionTitle}>Fields</h3>
        <div style={{ marginBottom: 12 }}>
          <input
            className={styles.input}
            placeholder="New field name"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            className={styles.input}
            placeholder="Option choices (comma-separated, for Option fields)"
            value={optionChoices}
            onChange={(e) => setOptionChoices(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <button
            type="button"
            className={dashStyles.actionBtn + " " + dashStyles.secondary}
            onClick={() => setShowFieldPicker(!showFieldPicker)}
          >
            {showFieldPicker ? "Hide field types" : "+ Add field"}
          </button>
        </div>

        {showFieldPicker && (
          <div className={styles.fieldGrid} style={{ marginBottom: 16 }}>
            {CMS_FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                type="button"
                className={styles.fieldTypeBtn}
                onClick={() => addField(ft.type)}
              >
                <span className={styles.fieldTypeIcon}>{ft.icon}</span>
                {ft.label}
              </button>
            ))}
          </div>
        )}

        {collection.fields.map((field) => (
          <div key={field.id} className={styles.fieldRow}>
            <div>
              <strong>{field.name}</strong>
              <div className={styles.fieldMeta}>
                {field.type.replace(/_/g, " ").toLowerCase()} · {field.slug}
              </div>
            </div>
            {field.type !== "DIVIDER" && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => deleteField(field.id)}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <h3 className={styles.sectionTitle}>Entries</h3>
        {entryMessage && <p className={styles.entryMessage}>{entryMessage}</p>}

        {collection.entries.length === 0 && !entryDraft && (
          <p className={dashStyles.subtitle}>No entries yet. Add one to start editing content.</p>
        )}

        {collection.entries.length > 0 && !entryDraft && (
          <div className={styles.entryTable}>
            {collection.entries.map((entry) => (
              <div key={entry.id} className={styles.entryRow}>
                <div>
                  <strong>{entry.slug}</strong>
                  <div className={styles.fieldMeta}>
                    {entry.published ? "Published" : "Draft"} ·{" "}
                    {Object.keys(entry.values).length} field
                    {Object.keys(entry.values).length !== 1 ? "s" : ""} set
                  </div>
                </div>
                <div className={styles.entryRowActions}>
                  <button
                    type="button"
                    className={dashStyles.actionBtn + " " + dashStyles.secondary}
                    onClick={() => openEntryEditor(entry.id)}
                    disabled={openingEntryId === entry.id}
                  >
                    {openingEntryId === entry.id ? "Loading…" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className={dashStyles.actionBtn + " " + dashStyles.danger}
                    onClick={() => deleteEntry(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {entryDraft && (
          <div className={styles.entryCard}>
            <div className={styles.entryHeader}>
              <div className={styles.entryEditMeta}>
                <label className={styles.fieldLabel}>Slug</label>
                <input
                  className={styles.input}
                  type="text"
                  value={entryDraft.slug}
                  onChange={(e) => updateDraftMeta({ slug: e.target.value })}
                />
              </div>
              <div className={styles.entryRowActions}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={entryDraft.published}
                    onChange={(e) => updateDraftMeta({ published: e.target.checked })}
                  />
                  Published
                </label>
                <button
                  type="button"
                  className={dashStyles.actionBtn + " " + dashStyles.primary}
                  onClick={saveEntryDraft}
                  disabled={savingEntry}
                >
                  {savingEntry ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  className={dashStyles.actionBtn + " " + dashStyles.secondary}
                  onClick={closeEntryEditor}
                  disabled={savingEntry}
                >
                  {savingEntry ? "Please wait…" : "Back to list"}
                </button>
                <button
                  type="button"
                  className={dashStyles.actionBtn + " " + dashStyles.danger}
                  onClick={() => deleteEntry(entryDraft.id)}
                  disabled={savingEntry}
                >
                  Delete
                </button>
              </div>
            </div>

            {contentFields.map((field) => (
              <CmsFieldInput
                key={field.id}
                field={field}
                value={getEntryFieldValue(entryDraft.values, field)}
                onChange={(val) => updateDraftValue(field.slug, val)}
                allCollections={collections}
              />
            ))}

            {contentFields.length === 0 && (
              <p className={dashStyles.subtitle}>Add fields above to edit content for this entry.</p>
            )}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}