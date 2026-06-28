"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface Dns {
  type: string;
  name: string;
  value: string;
}

export default function DomainPanel({ projectId }: { projectId: string }) {
  const [domain, setDomain] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [dns, setDns] = useState<Dns | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setCurrent(d.project.customDomain ?? null);
          setIsDeployed(!!d.project.isDeployed);
        }
      });
  }, [projectId]);

  async function connect() {
    setSaving(true);
    setError("");
    setDns(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCurrent(data.domain);
      setDns(data.dns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await fetch(`/api/projects/${projectId}/domain`, { method: "DELETE" });
    setCurrent(null);
    setDns(null);
    setDomain("");
  }

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <strong>Custom domain</strong>
      <p style={{ margin: "8px 0 12px", color: "var(--text-muted)", fontSize: 14, maxWidth: 480 }}>
        Point your own domain (e.g. <code>yoursite.com</code>) at your optimized site.
      </p>

      {!isDeployed && (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Deploy this project to Netlify first, then add your domain here.
        </p>
      )}

      {isDeployed && !current && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="yoursite.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={{
              flex: 1,
              minWidth: 220,
              padding: "10px 14px",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "var(--mono)",
            }}
          />
          <button
            type="button"
            className={`${dashStyles.actionBtn} ${dashStyles.primary}`}
            onClick={connect}
            disabled={saving || !domain.trim()}
          >
            {saving ? "Connecting…" : "Connect domain"}
          </button>
        </div>
      )}

      {current && (
        <div style={{ fontSize: 14 }}>
          <p style={{ margin: "0 0 8px" }}>
            Connected: <strong>{current}</strong>{" "}
            <button
              type="button"
              onClick={remove}
              style={{ marginLeft: 8, background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: 13 }}
            >
              Remove
            </button>
          </p>
        </div>
      )}

      {dns && (
        <div style={{ marginTop: 14, padding: 14, background: "var(--surface-2)", borderRadius: 8, fontSize: 13 }}>
          <strong>Last step — add this DNS record at your registrar:</strong>
          <table style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: 16, color: "var(--text-muted)" }}>Type</td>
                <td>{dns.type}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: 16, color: "var(--text-muted)" }}>Name</td>
                <td>{dns.name}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: 16, color: "var(--text-muted)" }}>Value</td>
                <td>{dns.value}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)" }}>
            DNS can take up to a few hours to take effect. SSL is issued automatically.
          </p>
        </div>
      )}

      {error && <p style={{ color: "var(--error)", marginTop: 12, fontSize: 14 }}>{error}</p>}
    </div>
  );
}
