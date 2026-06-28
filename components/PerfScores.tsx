"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface Scores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}
interface Result {
  before: Scores;
  after: Scores;
  measuredAt: string;
}

function color(n: number | null) {
  if (n == null) return "var(--text-muted)";
  if (n >= 90) return "#16a34a";
  if (n >= 50) return "#d97706";
  return "#dc2626";
}

function Ring({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color(value), letterSpacing: "-0.02em" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Column({ title, scores, dim }: { title: string; scores: Scores; dim?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 240, opacity: dim ? 0.7 : 1 }}>
      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "var(--text-secondary)" }}>{title}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <Ring label="Perf" value={scores.performance} />
        <Ring label="A11y" value={scores.accessibility} />
        <Ring label="Best" value={scores.bestPractices} />
        <Ring label="SEO" value={scores.seo} />
      </div>
    </div>
  );
}

export default function PerfScores({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/scores`)
      .then((r) => r.json())
      .then((d) => d.scores && setResult(d.scores));
  }, [projectId]);

  async function measure() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/scores`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Measurement failed");
      setResult(data.scores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Measurement failed");
    } finally {
      setLoading(false);
    }
  }

  const gain =
    result?.before.performance != null && result?.after.performance != null
      ? result.after.performance - result.before.performance
      : null;

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <strong>Performance proof</strong>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14, maxWidth: 460 }}>
            Real Google Lighthouse scores (mobile) — your original Framer site vs your optimized site.
          </p>
        </div>
        <button
          type="button"
          className={`${dashStyles.actionBtn} ${dashStyles.secondary}`}
          onClick={measure}
          disabled={loading}
        >
          {loading ? "Measuring… (~30s)" : result ? "Re-measure" : "Measure now"}
        </button>
      </div>

      {result && (
        <>
          {gain != null && gain > 0 && (
            <p style={{ margin: "16px 0 4px", fontSize: 15 }}>
              <strong style={{ color: "#16a34a" }}>+{gain} performance points</strong> on mobile 🚀
            </p>
          )}
          <div style={{ display: "flex", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
            <Column title="Original Framer" scores={result.before} dim />
            <Column title="Your optimized site" scores={result.after} />
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Measured {new Date(result.measuredAt).toLocaleString()}
          </p>
        </>
      )}

      {error && <p style={{ color: "var(--error)", marginTop: 12, fontSize: 14 }}>{error}</p>}
    </div>
  );
}
