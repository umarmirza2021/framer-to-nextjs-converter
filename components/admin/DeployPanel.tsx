"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface Deployment {
  id: string;
  url: string;
  state: string;
  createdAt: number;
}
interface LogEntry {
  id: string;
  platform: string;
  status: string;
  createdAt: string;
}

export default function DeployPanel() {
  const [platform, setPlatform] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/cms/deploy");
      const data = await res.json();
      setPlatform(data.platform);
      setDeployments(data.deployments ?? []);
      setLog(data.log ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function deploy() {
    setDeploying(true);
    setMessage("");
    const res = await fetch("/api/cms/deploy", { method: "POST" });
    const data = await res.json();
    setDeploying(false);
    setMessage(res.ok ? `Deploy triggered on ${data.platform}.` : data.error || "Failed.");
    load();
  }

  return (
    <div>
      <div className={styles.panel}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              Target: {platform ? platform : "not configured"}
            </div>
            <div className={styles.subtitle}>
              {platform
                ? "Push the current content and pages live."
                : "Add a deploy hook/token in Settings to enable deploys."}
            </div>
          </div>
          <button className={styles.btn} onClick={deploy} disabled={deploying || !platform}>
            {deploying ? "Deploying…" : "Deploy now"}
          </button>
        </div>
        {message && <p className={styles.success}>{message}</p>}
      </div>

      <div className={styles.title} style={{ fontSize: 16, margin: "20px 0 10px" }}>
        Recent deployments
      </div>
      {loading ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : deployments.length === 0 && log.length === 0 ? (
        <p className={styles.empty}>No deployments yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>State</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((d) => (
              <tr key={d.id}>
                <td>{new Date(d.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`${styles.badge} ${d.state === "READY" ? styles.badgeOn : styles.badgeOff}`}>
                    {d.state}
                  </span>
                </td>
                <td>
                  {d.url ? (
                    <a className={styles.rowLink} href={d.url} target="_blank" rel="noreferrer">
                      {d.url}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {deployments.length === 0 &&
              log.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeOff}`}>{l.status}</span>
                  </td>
                  <td>{l.platform}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
