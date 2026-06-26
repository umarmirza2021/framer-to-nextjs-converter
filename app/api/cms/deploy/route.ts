import { handler, ok, fail } from "@/lib/cms/api";
import { prisma } from "@/lib/prisma";
import { listDeployments, triggerDeploy } from "@/lib/cms/deploy";

// GET /api/cms/deploy — active platform, live deploy list, and local log
export const GET = handler(async () => {
  const [{ platform, deployments }, log] = await Promise.all([
    listDeployments(),
    prisma.cmsDeployment.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return ok({ platform, deployments, log });
});

// POST /api/cms/deploy — trigger a deploy on the active platform
export const POST = handler(async () => {
  const result = await triggerDeploy();
  if (!result.success) return fail(result.error || "Deploy failed", 400);
  return ok(result);
});
