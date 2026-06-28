import { createZip } from "@/lib/converter/zip";
import { deserializeFiles } from "@/lib/projects";
import { buildStaticBundle } from "./static";

interface NetlifyDeployResult {
  url: string;
  siteId: string;
  deployId: string;
}

async function createNetlifySite(accessToken: string, siteName: string) {
  const sanitizedName = siteName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const res = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${sanitizedName}-${Date.now().toString(36).slice(-4)}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Netlify site creation failed (${res.status})`);
  }
  return { id: data.id as string, fallbackUrl: data.ssl_url || data.url };
}

export async function deployToNetlify(
  accessToken: string,
  siteName: string,
  filesJson: string,
  existingSiteId?: string
): Promise<NetlifyDeployResult> {
  // Deploy a static site (real .html files), not the Next.js source — Netlify's
  // direct zip upload does not run a build, so source files would 404.
  const files = buildStaticBundle(deserializeFiles(filesJson));
  const zip = await createZip(files);

  // Reuse the project's existing site so the live URL stays stable across
  // redeploys (essential for auto-sync). Only create a new site on first deploy.
  let siteId = existingSiteId || "";
  let fallbackUrl: string | undefined;
  if (!siteId) {
    const created = await createNetlifySite(accessToken, siteName);
    siteId = created.id;
    fallbackUrl = created.fallbackUrl;
  }

  const doDeploy = (id: string) =>
    fetch(`https://api.netlify.com/api/v1/sites/${id}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zip),
    });

  let deployRes = await doDeploy(siteId);

  // The stored site may have been deleted on Netlify — create a fresh one and retry.
  if (!deployRes.ok && deployRes.status === 404 && existingSiteId) {
    const created = await createNetlifySite(accessToken, siteName);
    siteId = created.id;
    fallbackUrl = created.fallbackUrl;
    deployRes = await doDeploy(siteId);
  }

  const deployData = await deployRes.json();
  if (!deployRes.ok) {
    throw new Error(deployData?.message || `Netlify deploy failed (${deployRes.status})`);
  }

  const url =
    deployData.ssl_url || deployData.deploy_ssl_url || deployData.url || fallbackUrl;

  return {
    url: url?.startsWith("http") ? url : `https://${url}`,
    siteId,
    deployId: deployData.id || "",
  };
}

export async function verifyNetlifyToken(accessToken: string): Promise<string> {
  const response = await fetch("https://api.netlify.com/api/v1/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Invalid Netlify token");
  }

  const data = await response.json();
  return data.full_name || data.email || "Netlify account";
}