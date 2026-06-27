"use client";

import { CMS_FIELD_TYPES, type CMSFieldType } from "@/lib/cms/types";
import styles from "./admin.module.css";

export interface DraftField {
  name: string;
  key?: string;
  type: CMSFieldType;
  required: boolean;
}

export default function FieldBuilder({
  fields,
  onChange,
}: {
  fields: DraftField[];
  onChange: (fields: DraftField[]) => void;
}) {
  function update(index: number, patch: Partial<DraftField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    const next = [...fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function add() {
    onChange([...fields, { name: "", type: "text", required: false }]);
  }

  return (
    <div>
      {fields.length === 0 && (
        <p className={styles.subtitle}>No fields yet — add one below.</p>
      )}
      {fields.map((field, i) => (
        <div className={styles.fieldRow} key={i}>
          <input
            className={styles.input}
            placeholder="Field name (e.g. Title)"
            value={field.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <select
            className={styles.select}
            value={field.type}
            onChange={(e) => update(i, { type: e.target.value as CMSFieldType })}
          >
            {CMS_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className={styles.row} style={{ fontSize: 13, color: "#aeb3bf" }}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => update(i, { required: e.target.checked })}
            />
            required
          </label>
          <div className={styles.row}>
            <button type="button" className={styles.btnGhost} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => move(i, 1)}>
              ↓
            </button>
          </div>
          <button type="button" className={styles.btnDanger} onClick={() => remove(i)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={styles.btnGhost} onClick={add} style={{ marginTop: 8 }}>
        + Add field
      </button>
    </div>
  );
}
