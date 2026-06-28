import { prisma } from "@/lib/prisma";
import { projectFilesToDeployList } from "@/lib/deploy/files";
import { deployToNetlify } from "@/lib/deploy/netlify";
import { deployToVercel } from "@/lib/deploy/vercel";
import { convertFramerToNextJs } from "@/lib/converter";
import { serializeFiles } from "@/lib/projects";
import type { DeploymentAccount, Project } from "@prisma/client";

type Platform = "NETLIFY" | "VERCEL";

/**
 * Re-convert a project from its source URL (Performance Mode) and deploy the
 * optimized static site to the user's connected host. Records a Deployment row
 * and persists the fresh files.
 */
export async function runDeploy(
  project: Project,
  account: DeploymentAccount,
  platform: Platform
): Promise<{ url: string; deploymentId: string }> {
  const deployment = await prisma.deployment.create({
    data: { projectId: project.id, platform, status: "BUILDING" },
  });

  try {
    // Regenerate from source so the deploy reflects the latest content and
    // self-hosts optimized assets. Fall back to stored files if it fails.
    let filesJson = project.filesJson;
    try {
      const optimized = await convertFramerToNextJs(project.framerUrl, {
        performanceMode: true,
      });
      filesJson = serializeFiles(optimized.files);
    } catch {
      // keep stored filesJson
    }

    let url: string;
    let netlifySiteId: string | undefined;
    if (platform === "VERCEL") {
      const files = projectFilesToDeployList(filesJson);
      url = (await deployToVercel(account.accessToken, project.siteName, files)).url;
    } else {
      // Pass the project's existing site so redeploys keep the same live URL.
      const result = await deployToNetlify(
        account.accessToken,
        project.siteName,
        filesJson,
        project.netlifySiteId ?? undefined
      );
      url = result.url;
      netlifySiteId = result.siteId;
    }

    await prisma.$transaction([
      prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "READY", url },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          status: "DEPLOYED",
          filesJson,
          ...(netlifySiteId ? { netlifySiteId } : {}),
        },
      }),
    ]);

    return { url, deploymentId: deployment.id };
  } catch (error) {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
