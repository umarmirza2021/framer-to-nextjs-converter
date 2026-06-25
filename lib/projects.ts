import type {
  CmsDetectionResult,
  DetectedCmsCollection,
} from "@/lib/cms/framer-detector";
import { seedCmsFromDetection } from "@/lib/cms/seed-from-framer";
import { getCached } from "@/lib/converter/cache";
import { prisma } from "@/lib/prisma";
import type { ConversionResult } from "@/lib/converter/types";

interface SaveProjectInput {
  userId: string;
  framerUrl: string;
  previewId: string;
  title: string;
  siteName: string;
  stats: ConversionResult["stats"];
}

function serializeFiles(files: Record<string, string | Buffer>): string {
  const serialized: Record<string, string | { type: "buffer"; data: string }> = {};
  for (const [path, content] of Object.entries(files)) {
    if (Buffer.isBuffer(content)) {
      serialized[path] = { type: "buffer", data: content.toString("base64") };
    } else {
      serialized[path] = content;
    }
  }
  return JSON.stringify(serialized);
}

export async function saveProjectFromCache(input: SaveProjectInput) {
  const cached = await getCached(input.previewId);
  if (!cached) {
    throw new Error("Conversion cache expired. Please convert again.");
  }

  const project = await prisma.project.create({
    data: {
      userId: input.userId,
      framerUrl: input.framerUrl,
      title: input.title || cached.title,
      siteName: input.siteName || cached.siteName,
      stats: JSON.stringify(input.stats),
      filesJson: serializeFiles(cached.files),
      previewHtml: cached.previewHtml,
      cacheId: input.previewId,
      status: "READY",
    },
  });

  let cmsCollectionsCreated = 0;
  if (cached.cmsDetection) {
    try {
      const parsed = JSON.parse(cached.cmsDetection) as
        | CmsDetectionResult
        | DetectedCmsCollection[];
      const collections = Array.isArray(parsed) ? parsed : parsed.collections;
      cmsCollectionsCreated = await seedCmsFromDetection(project.id, collections, {
        replace: true,
      });
    } catch {
      // CMS seed is best-effort
    }
  }

  return { project, cmsCollectionsCreated };
}

export function deserializeFiles(
  raw: string
): Record<string, string | Buffer> {
  const parsed = JSON.parse(raw) as Record<string, string | { type: "buffer"; data: string }>;
  const files: Record<string, string | Buffer> = {};
  for (const [path, content] of Object.entries(parsed)) {
    if (typeof content === "string") {
      files[path] = content;
    } else {
      files[path] = Buffer.from(content.data, "base64");
    }
  }
  return files;
}