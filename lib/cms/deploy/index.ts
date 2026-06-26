import { prisma } from "@/lib/prisma";
import { getSetting } from "../settings";
import {
  getVercelDeployments,
  triggerVercelDeploy,
  type Deployment,
  type DeployResult,
} from "./vercel";
import { getNetlifyDeploys, triggerNetlifyDeploy } from "./netlify";

export type Platform = "vercel" | "netlify";

/** Which platform is configured (Vercel preferred). */
export async function activePlatform(): Promise<Platform | null> {
  if (await getSetting("VERCEL_DEPLOY_HOOK_URL")) return "vercel";
  if (await getSetting("NETLIFY_HOOK_ID")) return "netlify";
  return null;
}

/** Trigger a deploy on the active platform and log it. */
export async function triggerDeploy(): Promise<DeployResult & { platform?: Platform }> {
  const platform = await activePlatform();
  if (!platform) {
    return { success: false, error: "No deploy target configured. Add tokens in Settings." };
  }

  const result =
    platform === "vercel" ? await triggerVercelDeploy() : await triggerNetlifyDeploy();

  await prisma.cmsDeployment.create({
    data: {
      platform,
      status: result.success ? "triggered" : "failed",
      deployId: result.deployId ?? null,
      url: result.url ?? null,
    },
  });

  return { ...result, platform };
}

/** Recent deployments from the active platform's API. */
export async function listDeployments(): Promise<{ platform: Platform | null; deployments: Deployment[] }> {
  const platform = await activePlatform();
  if (platform === "vercel") return { platform, deployments: await getVercelDeployments() };
  if (platform === "netlify") return { platform, deployments: await getNetlifyDeploys() };
  return { platform: null, deployments: [] };
}

export { streamVercelLogs } from "./vercel";
