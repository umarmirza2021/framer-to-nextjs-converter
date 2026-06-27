"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

const FIELDS: { key: string; label: string; hint?: string; type?: string }[] = [
  { key: "VERCEL_DEPLOY_HOOK_URL", label: "Vercel Deploy Hook URL" },
  { key: "VERCEL_TOKEN", label: "Vercel API Token" },
  { key: "VERCEL_PROJECT_ID", label: "Vercel Project ID" },
  { key: "VERCEL_TEAM_ID", label: "Vercel Team ID (optional)" },
  { key: "NETLIFY_HOOK_ID", label: "Netlify Build Hook ID" },
  { key: "NETLIFY_TOKEN", label: "Netlify API Token" },
  { key: "NETLIFY_SITE_ID", label: "Netlify Site ID" },
];

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [provider, setProvider] = useState("local");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setValues(data);
        setAutoDeploy(data.AUTO_DEPLOY === "true");
        setProvider(data.MEDIA_PROVIDER || "local");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const payload: Record<string, string> = {
      ...values,
      AUTO_DEPLOY: String(autoDeploy),
      MEDIA_PROVIDER: provider,
    };
    const res = await fetch("/api/cms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setMessage(res.ok ? "Settings saved." : "Failed to save.");
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <div className={styles.panel}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Deploy credentials</div>
      <p className={styles.subtitle} style={{ marginBottom: 8 }}>
        Secrets are stored masked; leave a masked field untouched to keep it.
      </p>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className={styles.label}>{f.label}</label>
          <input
            className={styles.input}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </div>
      ))}

      <label className={styles.label} style={{ marginTop: 18 }}>
        Media provider
      </label>
      <select className={styles.select} value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="local">local (out of the box)</option>
        <option value="cloudinary">cloudinary</option>
        <option value="s3">s3</option>
      </select>

      <label className={styles.row} style={{ marginTop: 18, color: "#aeb3bf", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={autoDeploy}
          onChange={(e) => setAutoDeploy(e.target.checked)}
        />
        Auto-deploy on publish
      </label>

      {message && <p className={styles.success}>{message}</p>}

      <button className={styles.btn} onClick={save} disabled={saving} style={{ marginTop: 18 }}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
