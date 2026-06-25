"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dashStyles from "@/app/dashboard/dashboard.module.css";

interface Deployment {
  id: string;
  platform: string;
  url: string | null;
  status: string;
  createdAt: string;
}

interface DeployPanelProps {
  projectId: string;
}

export default function DeployPanel({ projectId }: DeployPanelProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [connected, setConnected] = useState<{ NETLIFY?: boolean; VERCEL?: boolean }>({});
  const [deploying, setDeploying] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/deploy`)
      .then((r) => r.json())
      .then((d) => setDeployments(d.deployments || []));
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => {
        const acc: { NETLIFY?: boolean; VERCEL?: boolean } = {};
        for (const a of d.accounts || []) {
          acc[a.platform as "NETLIFY" | "VERCEL"] = true;
        }
        setConnected(acc);
      });
  }, [projectId]);

  async function deploy(platform: "NETLIFY" | "VERCEL") {
    setDeploying(platform);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setDeployments((prev) => [data.deployment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(null);
    }
  }

  return (
    <div className={dashStyles.comingSoon} style={{ marginTop: 20 }}>
      <strong>Deploy to your account</strong>
      <p style={{ margin: "8px 0 12px", color: "var(--text-muted)", fontSize: 14 }}>
        Push this Next.js project directly to Netlify or Vercel using your connected account.
      </p>

      <div className={dashStyles.actions}>
        <button
          type="button"
          className={`${dashStyles.actionBtn} ${dashStyles.primary}`}
          onClick={() => deploy("VERCEL")}
          disabled={!connected.VERCEL || deploying !== null}
          title={connected.VERCEL ? "Deploy to Vercel" : "Connect Vercel in Settings"}
        >
          {deploying === "VERCEL" ? "Deploying…" : "Deploy to Vercel"}
        </button>
        <button
          type="button"
          className={`${dashStyles.actionBtn} ${dashStyles.secondary}`}
          onClick={() => deploy("NETLIFY")}
          disabled={!connected.NETLIFY || deploying !== null}
          title={connected.NETLIFY ? "Deploy to Netlify" : "Connect Netlify in Settings"}
        >
          {deploying === "NETLIFY" ? "Deploying…" : "Deploy to Netlify"}
        </button>
        <Link href="/dashboard/settings" className={`${dashStyles.actionBtn} ${dashStyles.secondary}`}>
          Settings
        </Link>
      </div>

      {(!connected.VERCEL || !connected.NETLIFY) && (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          {!connected.VERCEL && !connected.NETLIFY
            ? "Connect Netlify and/or Vercel in "
            : !connected.VERCEL
              ? "Connect Vercel in "
              : "Connect Netlify in "}
          <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>
            Settings
          </Link>{" "}
          to enable one-click deploy.
        </p>
      )}

      {error && <p style={{ color: "var(--error)", marginTop: 12, fontSize: 14 }}>{error}</p>}

      {deployments.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 13 }}>Recent deployments</strong>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
            {deployments.map((d) => (
              <li
                key={d.id}
                style={{
                  fontSize: 13,
                  marginBottom: 6,
                  color: "var(--text-muted)",
                }}
              >
                {d.platform} — {d.status}
                {d.url && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                      {d.url}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}