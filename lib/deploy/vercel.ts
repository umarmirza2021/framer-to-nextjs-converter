interface VercelDeployResult {
  url: string;
  deploymentId: string;
}

export async function deployToVercel(
  accessToken: string,
  projectName: string,
  files: { file: string; data: string }[]
): Promise<VercelDeployResult> {
  const sanitizedName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: sanitizedName,
      files: files.map((f) => ({ file: f.file, data: f.data, encoding: "base64" })),
      projectSettings: {
        framework: "nextjs",
      },
      target: "production",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || `Vercel deploy failed (${response.status})`;
    throw new Error(message);
  }

  const host = data.url || `${sanitizedName}.vercel.app`;
  const url = host.startsWith("http") ? host : `https://${host}`;

  return {
    url,
    deploymentId: data.id || data.uid || "",
  };
}

export async function verifyVercelToken(accessToken: string): Promise<string> {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Invalid Vercel token");
  }

  const data = await response.json();
  return data.user?.username || data.user?.email || "Vercel account";
}