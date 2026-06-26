"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cms } from "@/lib/cms/fetch";
import type { CMSBinding, CMSField, CMSLayerType, CMSPageType } from "@/lib/cms/types";
import type { DetectedLayer } from "@/lib/cms/bindings";
import styles from "./admin.module.css";

const LAYER_TYPES: CMSLayerType[] = ["text", "image", "background-image", "href"];

export default function BindingEditor({
  pageId,
  collectionId,
  pageType,
  fields,
  layers,
  initialBindings,
}: {
  pageId: string;
  collectionId: string;
  pageType: CMSPageType;
  fields: CMSField[];
  layers: DetectedLayer[];
  initialBindings: CMSBinding[];
}) {
  const router = useRouter();
  const [bindings, setBindings] = useState<CMSBinding[]>(initialBindings);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function bindingFor(layerId: string) {
    return bindings.find((b) => b.layerId === layerId);
  }

  function setBinding(layerId: string, fieldKey: string, layerType: CMSLayerType) {
    setBindings((prev) => {
      const without = prev.filter((b) => b.layerId !== layerId);
      if (!fieldKey) return without; // unbind
      return [
        ...without,
        { layerId, layerType, collectionId, fieldKey, pageType },
      ];
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await cms.savePageBindings(pageId, bindings);
      setMessage("Bindings saved. The page will use live content on next render.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className={styles.bindCols}>
        <div>
          <label className={styles.label}>Layers on this page</label>
          {layers.length === 0 && <p className={styles.empty}>No named layers found.</p>}
          <div className={styles.layerList}>
            {layers.map((layer) => {
              const bound = bindingFor(layer.id);
              return (
                <div
                  key={layer.id}
                  className={`${styles.layerItem} ${bound ? styles.layerBound : ""}`}
                  onClick={() => setSelected(layer.id)}
                >
                  <span>
                    {layer.name}
                    {bound && <span style={{ color: "#6ea8fe" }}> → {bound.fieldKey}</span>}
                  </span>
                  <span className={styles.layerType}>{layer.type}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className={styles.label}>Bind selected layer</label>
          {!selected && <p className={styles.empty}>Select a layer to bind it.</p>}
          {selected && (
            <div className={styles.panel}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>{selected}</div>

              <label className={styles.label}>Field</label>
              <select
                className={styles.select}
                value={bindingFor(selected)?.fieldKey ?? ""}
                onChange={(e) =>
                  setBinding(
                    selected,
                    e.target.value,
                    bindingFor(selected)?.layerType ?? "text"
                  )
                }
              >
                <option value="">— none (unbind) —</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.key}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>

              <label className={styles.label}>Render as</label>
              <select
                className={styles.select}
                value={bindingFor(selected)?.layerType ?? "text"}
                onChange={(e) =>
                  setBinding(
                    selected,
                    bindingFor(selected)?.fieldKey ?? "",
                    e.target.value as CMSLayerType
                  )
                }
                disabled={!bindingFor(selected)}
              >
                {LAYER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {message && <p className={styles.success}>{message}</p>}

      <button className={styles.btn} onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? "Saving…" : "Save bindings"}
      </button>
    </div>
  );
}
