import { getSetting } from "../settings";

export interface DeployResult {
  success: boolean;
  deployId?: string;
  url?: string;
  error?: string;
}

export interface Deployment {
  id: string;
  url: string;
  state: string;
  createdAt: number;
}

/** Trigger a Vercel deployment via the configured deploy hook URL. */
export async function triggerVercelDeploy(): Promise<DeployResult> {
  const hook = await getSetting("VERCEL_DEPLOY_HOOK_URL");
  if (!hook) {
    return { success: false, error: "VERCEL_DEPLOY_HOOK_URL is not configured." };
  }
  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      return { success: false, error: `Vercel hook returned ${res.status}` };
    }
    const body = (await res.json().catch(() => ({}))) as {
      job?: { id?: string };
    };
    return { success: true, deployId: body.job?.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

/** List recent Vercel deployments using the REST API. */
export async function getVercelDeployments(limit = 10): Promise<Deployment[]> {
  const token = await getSetting("VERCEL_TOKEN");
  if (!token) return [];
  const projectId = await getSetting("VERCEL_PROJECT_ID");
  const teamId = await getSetting("VERCEL_TEAM_ID");

  const params = new URLSearchParams({ limit: String(limit) });
  if (projectId) params.set("projectId", projectId);
  if (teamId) params.set("teamId", teamId);

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    deployments?: { uid: string; url: string; state: string; created: number }[];
  };
  return (body.deployments ?? []).map((d) => ({
    id: d.uid,
    url: d.url ? `https://${d.url}` : "",
    state: d.state,
    createdAt: d.created,
  }));
}

/** Stream a Vercel deployment's build log events line by line. */
export async function* streamVercelLogs(
  deployId: string
): AsyncGenerator<string> {
  const token = await getSetting("VERCEL_TOKEN");
  if (!token) return;
  const teamId = await getSetting("VERCEL_TEAM_ID");
  const params = new URLSearchParams({ follow: "1" });
  if (teamId) params.set("teamId", teamId);

  const res = await fetch(
    `https://api.vercel.com/v2/deployments/${deployId}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const evt = JSON.parse(trimmed) as { text?: string; payload?: { text?: string } };
        const text = evt.text ?? evt.payload?.text;
        if (text) yield text;
      } catch {
        yield trimmed;
      }
    }
  }
}
