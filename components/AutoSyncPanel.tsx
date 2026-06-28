"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface AutoSyncPanelProps {
  projectId: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function AutoSyncPanel({ projectId }: AutoSyncPanelProps) {
  const [autoSync, setAutoSync] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setAutoSync(!!d.project.autoSync);
          setLastChecked(d.project.lastCheckedAt ?? null);
          setLastSynced(d.project.lastSyncedAt ?? null);
        }
      });
  }, [projectId]);

  async function toggle() {
    const next = !autoSync;
    setAutoSync(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSync: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAutoSync(!next); // revert on failure
      setMessage("Couldn't update — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function checkNow() {
    setChecking(true);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Check failed");
      const map: Record<string, string> = {
        unchanged: "No changes — your site is already up to date. ✓",
        updated: "Found changes — rebuilt your optimized site. ✓",
        deployed: `Found changes — rebuilt and redeployed live. ✓`,
      };
      setMessage(map[data.status] || "Done.");
      const refreshed = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
      if (refreshed.project) {
        setLastChecked(refreshed.project.lastCheckedAt ?? null);
        setLastSynced(refreshed.project.lastSyncedAt ?? null);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <strong>Auto-sync with Framer</strong>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14, maxWidth: 460 }}>
            When you republish in Framer, we automatically re-optimize and redeploy your
            site. We check every few hours — no Framer plan or setup needed.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoSync}
          onClick={toggle}
          disabled={saving}
          title={autoSync ? "Turn auto-sync off" : "Turn auto-sync on"}
          style={{
            flexShrink: 0,
            width: 46,
            height: 26,
            borderRadius: 999,
            border: "none",
            cursor: saving ? "wait" : "pointer",
            background: autoSync ? "var(--accent)" : "var(--border-strong)",
            position: "relative",
            transition: "background 0.15s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: autoSync ? 23 : 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s",
            }}
          />
        </button>
      </div>

      <div className={dashStyles.actions} style={{ marginTop: 16 }}>
        <button
          type="button"
          className={`${dashStyles.actionBtn} ${dashStyles.secondary}`}
          onClick={checkNow}
          disabled={checking}
        >
          {checking ? "Checking…" : "Check now"}
        </button>
        <span style={{ fontSize: 13, color: "var(--text-muted)", alignSelf: "center" }}>
          Last checked: {timeAgo(lastChecked)} · Last update: {timeAgo(lastSynced)}
        </span>
      </div>

      {message && (
        <p style={{ marginTop: 12, fontSize: 14, color: "var(--text-secondary)" }}>{message}</p>
      )}
    </div>
  );
}
