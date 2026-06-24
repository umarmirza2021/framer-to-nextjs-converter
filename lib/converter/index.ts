import { getCached, storeConversion } from "./cache";
import { buildHtmlDocument, generateNextJsProject } from "./generator";
import { parseFramerSite } from "./parser";
import { createZip } from "./zip";
import type { ConversionResult } from "./types";

export async function convertFramerToNextJs(url: string): Promise<ConversionResult> {
  const site = await parseFramerSite(url);
  const files = await generateNextJsProject(site);

  const cssSize = site.styles.reduce((sum, s) => sum + s.length, 0);
  const assetCount = Object.keys(files).filter((f) => f.startsWith("public/assets/")).length;

  return {
    site,
    files,
    stats: {
      pages: site.pages.length,
      assets: assetCount,
      cssSize,
    },
  };
}

export async function convertAndZip(url: string): Promise<{ zip: Buffer; stats: ConversionResult["stats"]; siteName: string }> {
  const result = await convertFramerToNextJs(url);
  const zip = await createZip(result.files);
  const siteName = new URL(result.site.url).hostname.replace(/\./g, "-");

  return {
    zip,
    stats: result.stats,
    siteName,
  };
}

export async function convertForPreview(url: string): Promise<{
  previewId: string;
  stats: ConversionResult["stats"];
  siteName: string;
  title: string;
}> {
  const result = await convertFramerToNextJs(url);
  const zip = await createZip(result.files);
  const siteName = new URL(result.site.url).hostname.replace(/\./g, "-");
  const homePage =
    result.site.pages.find((p) => p.path === "/" || p.path === "") ||
    result.site.pages[0];
  const previewHtml = buildHtmlDocument(homePage, result.site);

  const previewId = storeConversion({
    zip,
    previewHtml,
    stats: result.stats,
    siteName,
    title: result.site.meta.title,
  });

  return {
    previewId,
    stats: result.stats,
    siteName,
    title: result.site.meta.title,
  };
}

export function getPreviewHtml(id: string): string | null {
  return getCached(id)?.previewHtml ?? null;
}

export function getCachedZip(
  id: string
): { zip: Buffer; siteName: string; stats: ConversionResult["stats"] } | null {
  const entry = getCached(id);
  if (!entry) return null;
  return { zip: entry.zip, siteName: entry.siteName, stats: entry.stats };
}

export { normalizeFramerUrl, isFramerUrl } from "./fetcher";
export type { ConversionResult, FramerSite } from "./types";