"use client";

import { useEffect, useState } from "react";
import dashStyles from "@/app/dashboard/dashboard.module.css";
import styles from "./cms/cms.module.css";

interface Account {
  platform: string;
  accountName: string | null;
  updatedAt: string;
}

export default function IntegrationSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netlifyToken, setNetlifyToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function load() {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  }

  useEffect(() => {
    load();
  }, []);

  async function connect(platform: "NETLIFY" | "VERCEL", token: string) {
    setLoading(platform);
    setMessage("");
    const res = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, accessToken: token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Connection failed");
    } else {
      setMessage(`${platform === "NETLIFY" ? "Netlify" : "Vercel"} connected successfully`);
      if (platform === "NETLIFY") setNetlifyToken("");
      else setVercelToken("");
      load();
    }
    setLoading(null);
  }

  async function disconnect(platform: "NETLIFY" | "VERCEL") {
    await fetch(`/api/settings/integrations?platform=${platform}`, { method: "DELETE" });
    load();
  }

  const netlify = accounts.find((a) => a.platform === "NETLIFY");
  const vercel = accounts.find((a) => a.platform === "VERCEL");

  return (
    <main className={dashStyles.dashboard}>
      <h1 className={dashStyles.title}>Integrations</h1>
      <p className={dashStyles.subtitle}>
        Connect your hosting accounts to deploy converted sites directly from the dashboard
      </p>

      {message && (
        <p style={{ color: "var(--success)", marginBottom: 16, fontSize: 14 }}>{message}</p>
      )}

      <div className={styles.panel} style={{ marginBottom: 20 }}>
        <h2 className={styles.panelTitle}>Vercel</h2>
        {vercel ? (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Connected as <strong>{vercel.accountName}</strong>
            </p>
            <button
              type="button"
              className={`${dashStyles.actionBtn} ${dashStyles.danger}`}
              style={{ marginTop: 12 }}
              onClick={() => disconnect("VERCEL")}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
              Create a token at{" "}
              <a
                href="https://vercel.com/account/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                vercel.com/account/settings/tokens
              </a>
            </p>
            <input
              className={styles.input}
              type="password"
              placeholder="Vercel access token"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
            />
            <button
              type="button"
              className={`${dashStyles.actionBtn} ${dashStyles.primary}`}
              style={{ marginTop: 12 }}
              disabled={!vercelToken.trim() || loading === "VERCEL"}
              onClick={() => connect("VERCEL", vercelToken)}
            >
              {loading === "VERCEL" ? "Connecting…" : "Connect Vercel"}
            </button>
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Netlify</h2>
        {netlify ? (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Connected as <strong>{netlify.accountName}</strong>
            </p>
            <button
              type="button"
              className={`${dashStyles.actionBtn} ${dashStyles.danger}`}
              style={{ marginTop: 12 }}
              onClick={() => disconnect("NETLIFY")}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
              Create a token at{" "}
              <a
                href="https://app.netlify.com/user/applications#personal-access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                Netlify personal access tokens
              </a>
            </p>
            <input
              className={styles.input}
              type="password"
              placeholder="Netlify access token"
              value={netlifyToken}
              onChange={(e) => setNetlifyToken(e.target.value)}
            />
            <button
              type="button"
              className={`${dashStyles.actionBtn} ${dashStyles.primary}`}
              style={{ marginTop: 12 }}
              disabled={!netlifyToken.trim() || loading === "NETLIFY"}
              onClick={() => connect("NETLIFY", netlifyToken)}
            >
              {loading === "NETLIFY" ? "Connecting…" : "Connect Netlify"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}