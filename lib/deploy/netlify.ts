import { createZip } from "@/lib/converter/zip";
import { deserializeFiles } from "@/lib/projects";

interface NetlifyDeployResult {
  url: string;
  siteId: string;
  deployId: string;
}

export async function deployToNetlify(
  accessToken: string,
  siteName: string,
  filesJson: string
): Promise<NetlifyDeployResult> {
  const files = deserializeFiles(filesJson);
  const zip = await createZip(files);

  const sanitizedName = siteName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  let siteId: string;
  const siteRes = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${sanitizedName}-${Date.now().toString(36).slice(-4)}`,
    }),
  });

  const siteData = await siteRes.json();

  if (!siteRes.ok) {
    const message = siteData?.message || `Netlify site creation failed (${siteRes.status})`;
    throw new Error(message);
  }

  siteId = siteData.id as string;

  const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/zip",
    },
    body: new Uint8Array(zip),
  });

  const deployData = await deployRes.json();

  if (!deployRes.ok) {
    const message = deployData?.message || `Netlify deploy failed (${deployRes.status})`;
    throw new Error(message);
  }

  const url =
    deployData.ssl_url ||
    deployData.deploy_ssl_url ||
    deployData.url ||
    siteData.ssl_url ||
    siteData.url;

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