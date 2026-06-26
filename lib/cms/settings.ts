import { prisma } from "@/lib/prisma";

/** Known setting keys with their env-var fallback (env wins only if no DB value). */
const ENV_FALLBACK: Record<string, string | undefined> = {
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  VERCEL_DEPLOY_HOOK_URL: process.env.VERCEL_DEPLOY_HOOK_URL,
  NETLIFY_TOKEN: process.env.NETLIFY_TOKEN,
  NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
  NETLIFY_HOOK_ID: process.env.NETLIFY_HOOK_ID,
  MEDIA_PROVIDER: process.env.MEDIA_PROVIDER ?? "local",
  AUTO_DEPLOY: process.env.AUTO_DEPLOY ?? "false",
};

/** Keys that hold secrets — masked when listed to the client. */
export const SECRET_KEYS = new Set([
  "VERCEL_TOKEN",
  "NETLIFY_TOKEN",
  "VERCEL_DEPLOY_HOOK_URL",
]);

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await prisma.cmsSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return ENV_FALLBACK[key];
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.cmsSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setMany(values: Record<string, string>): Promise<void> {
  await Promise.all(Object.entries(values).map(([k, v]) => setSetting(k, v)));
}

/** All settings, with secret values masked (for display in the UI). */
export async function getMaskedSettings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(ENV_FALLBACK)) {
    const value = await getSetting(key);
    if (value && SECRET_KEYS.has(key)) {
      out[key] = `••••••${value.slice(-4)}`;
    } else {
      out[key] = value ?? "";
    }
  }
  return out;
}

export async function isAutoDeploy(): Promise<boolean> {
  return (await getSetting("AUTO_DEPLOY")) === "true";
}
