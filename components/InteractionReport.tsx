"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";

type Status = "preserved" | "restored" | "added" | "partial" | "lost";
interface Finding {
  id: string;
  label: string;
  count: number;
  status: Status;
  note: string;
}
interface Audit {
  findings: Finding[];
  preserved: number;
  lost: number;
}

const STYLE: Record<Status, { bg: string; fg: string; text: string }> = {
  preserved: { bg: "#dcfce7", fg: "#16a34a", text: "Kept" },
  restored: { bg: "#dcfce7", fg: "#16a34a", text: "Restored" },
  added: { bg: "#dbeafe", fg: "#2563eb", text: "Added" },
  partial: { bg: "#fef3c7", fg: "#d97706", text: "Partial" },
  lost: { bg: "#f3f4f6", fg: "#6b7280", text: "Dropped" },
};

export default function InteractionReport({ projectId }: { projectId: string }) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/interactions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAudit(d.audit);
      })
      .catch(() => setError("Couldn't load the interaction report"))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <strong>Interaction report</strong>
      <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14, maxWidth: 480 }}>
        What carries over from Framer, and what changes when we strip the runtime for speed.
        {audit && (
          <>
            {" "}
            <strong style={{ color: "var(--text)" }}>
              {audit.preserved} kept · {audit.lost} dropped
            </strong>
          </>
        )}
      </p>

      {loading && (
        <p style={{ marginTop: 14, fontSize: 14, color: "var(--text-muted)" }}>Analyzing…</p>
      )}
      {error && <p style={{ marginTop: 14, fontSize: 14, color: "var(--error)" }}>{error}</p>}

      {audit && (
        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 10 }}>
          {audit.findings.map((f) => {
            const s = STYLE[f.status];
            return (
              <li key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: s.bg,
                    color: s.fg,
                    minWidth: 64,
                    textAlign: "center",
                  }}
                >
                  {s.text}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{f.note}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
