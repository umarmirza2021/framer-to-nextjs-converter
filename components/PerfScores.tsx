"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface Scores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}
interface Pair {
  before: Scores;
  after: Scores;
}
interface Result {
  mobile: Pair;
  desktop?: Pair;
  measuredAt: string;
}

// Accept both the new {mobile,desktop} shape and the old flat {before,after}.
function normalize(s: unknown): Result | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  if (obj.mobile) return obj as unknown as Result;
  if (obj.before) {
    return { mobile: { before: obj.before, after: obj.after } as Pair, measuredAt: obj.measuredAt as string };
  }
  return null;
}

function color(n: number | null) {
  if (n == null) return "var(--text-muted)";
  if (n >= 90) return "#16a34a";
  if (n >= 50) return "#d97706";
  return "#dc2626";
}

function Ring({ label, value, big }: { label: string; value: number | null; big?: boolean }) {
  return (
    <div style={{ textAlign: "center", minWidth: 58 }}>
      <div style={{ fontSize: big ? 30 : 24, fontWeight: 700, color: color(value), letterSpacing: "-0.02em" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Card({
  badge,
  title,
  scores,
  variant,
}: {
  badge: string;
  title: string;
  scores: Scores;
  variant: "before" | "after";
}) {
  const after = variant === "after";
  return (
    <div
      style={{
        flex: 1,
        minWidth: 250,
        border: `1px solid ${after ? "var(--text)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        background: after ? "var(--surface)" : "var(--surface-2)",
        opacity: after ? 1 : 0.85,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 999,
            background: after ? "var(--text)" : "var(--border-strong)",
            color: after ? "var(--accent-text)" : "var(--text)",
          }}
        >
          {badge}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
        <Ring label="Perf" value={scores.performance} big={after} />
        <Ring label="A11y" value={scores.accessibility} big={after} />
        <Ring label="Best" value={scores.bestPractices} big={after} />
        <Ring label="SEO" value={scores.seo} big={after} />
      </div>
    </div>
  );
}

export default function PerfScores({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/scores`)
      .then((r) => r.json())
      .then((d) => setResult(normalize(d.scores)));
  }, [projectId]);

  async function measure() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/scores`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Measurement failed");
      setResult(normalize(data.scores));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Measurement failed");
    } finally {
      setLoading(false);
    }
  }

  const pair = result ? (view === "desktop" ? result.desktop : result.mobile) : null;
  const gain =
    pair?.before.performance != null && pair?.after.performance != null
      ? pair.after.performance - pair.before.performance
      : null;

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <strong>Performance proof</strong>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14, maxWidth: 460 }}>
            Real Google Lighthouse scores (mobile &amp; desktop) — your original Framer site vs your optimized site.
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
          {/* Mobile / Desktop toggle */}
          <div style={{ display: "inline-flex", gap: 2, marginTop: 16, padding: 3, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999 }}>
            {(["mobile", "desktop"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                disabled={v === "desktop" && !result.desktop}
                style={{
                  border: "none",
                  cursor: v === "desktop" && !result.desktop ? "not-allowed" : "pointer",
                  padding: "5px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: "capitalize",
                  background: view === v ? "var(--accent)" : "transparent",
                  color: view === v ? "var(--accent-text)" : "var(--text-muted)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {pair ? (
            <>
              {gain != null && gain > 0 && (
                <p style={{ margin: "16px 0 10px", fontSize: 16, fontWeight: 600 }}>
                  <span style={{ color: "#16a34a" }}>+{gain} performance points</span> on {view} 🚀
                </p>
              )}
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <Card badge="Before" title="Original Framer" scores={pair.before} variant="before" />
                <span style={{ fontSize: 22, color: "var(--text-muted)", fontWeight: 600 }}>→</span>
                <Card badge="After" title="Your optimized site" scores={pair.after} variant="after" />
              </div>
            </>
          ) : (
            <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
              Re-measure to see {view} scores.
            </p>
          )}

          <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Measured {new Date(result.measuredAt).toLocaleString()}
          </p>
        </>
      )}

      {error && <p style={{ color: "var(--error)", marginTop: 12, fontSize: 14 }}>{error}</p>}
    </div>
  );
}
