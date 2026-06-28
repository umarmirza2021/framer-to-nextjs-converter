import { prisma } from "@/lib/prisma";
import { convertFramerToNextJs } from "@/lib/converter";
import { buildHtmlDocument } from "@/lib/converter/generator";
import { serializeFiles } from "@/lib/projects";
import { runDeploy } from "@/lib/deploy/run";
import { fetchContentHash } from "./detect";

export type SyncResult = {
  status: "unchanged" | "updated" | "deployed" | "error";
  message?: string;
  url?: string;
};

/**
 * Check one project's Framer source for changes. If changed (or first run):
 * re-convert in Performance Mode, store the fresh build, and — if the project
 * was previously deployed and a host is connected — redeploy automatically.
 */
export async function syncProject(projectId: string): Promise<SyncResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { status: "error", message: "Project not found" };

  try {
    const hash = await fetchContentHash(project.framerUrl);
    await prisma.project.update({
      where: { id: projectId },
      data: { lastCheckedAt: new Date() },
    });

    // No change since last check → nothing to do.
    if (project.contentHash && project.contentHash === hash) {
      return { status: "unchanged" };
    }

    // Content changed (or first sync): rebuild from source.
    const result = await convertFramerToNextJs(project.framerUrl, {
      performanceMode: true,
    });
    const homePage =
      result.site.pages.find((p) => p.path === "/" || p.path === "") ?? result.site.pages[0];
    const previewHtml = homePage
      ? buildHtmlDocument(homePage, result.site)
      : project.previewHtml;
    const filesJson = serializeFiles(result.files);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        filesJson,
        stats: JSON.stringify(result.stats),
        previewHtml,
        contentHash: hash,
        lastSyncedAt: new Date(),
      },
    });

    // Auto-redeploy only if this project is already live somewhere.
    if (project.status === "DEPLOYED") {
      // Redeploy to the SAME platform the project was last deployed to, so a
      // user with both hosts connected doesn't get a redeploy to the wrong one.
      const lastDeploy = await prisma.deployment.findFirst({
        where: { projectId, status: "READY" },
        orderBy: { createdAt: "desc" },
        select: { platform: true },
      });
      const platform = lastDeploy?.platform as "NETLIFY" | "VERCEL" | undefined;

      const account = platform
        ? await prisma.deploymentAccount.findUnique({
            where: { userId_platform: { userId: project.userId, platform } },
          })
        : await prisma.deploymentAccount.findFirst({ where: { userId: project.userId } });

      if (account) {
        const fresh = await prisma.project.findUnique({ where: { id: projectId } });
        // Reuse the build we just made — avoids converting the site a second time.
        const { url } = await runDeploy(
          fresh!,
          account,
          account.platform as "NETLIFY" | "VERCEL",
          filesJson
        );
        return { status: "deployed", url };
      }
    }

    return { status: "updated" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sync failed",
    };
  }
}
