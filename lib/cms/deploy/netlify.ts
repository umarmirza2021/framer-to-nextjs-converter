import { getSetting } from "../settings";
import type { Deployment, DeployResult } from "./vercel";

/** Trigger a Netlify build via the configured build hook. */
export async function triggerNetlifyDeploy(): Promise<DeployResult> {
  const hookId = await getSetting("NETLIFY_HOOK_ID");
  if (!hookId) {
    return { success: false, error: "NETLIFY_HOOK_ID is not configured." };
  }
  try {
    const res = await fetch(`https://api.netlify.com/build_hooks/${hookId}`, {
      method: "POST",
    });
    return res.ok
      ? { success: true }
      : { success: false, error: `Netlify hook returned ${res.status}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

/** List recent Netlify deploys via the REST API. */
export async function getNetlifyDeploys(limit = 10): Promise<Deployment[]> {
  const token = await getSetting("NETLIFY_TOKEN");
  const siteId = await getSetting("NETLIFY_SITE_ID");
  if (!token || !siteId) return [];

  const res = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const body = (await res.json()) as {
    id: string;
    deploy_ssl_url?: string;
    ssl_url?: string;
    state: string;
    created_at: string;
  }[];
  return body.map((d) => ({
    id: d.id,
    url: d.deploy_ssl_url || d.ssl_url || "",
    state: d.state,
    createdAt: new Date(d.created_at).getTime(),
  }));
}
