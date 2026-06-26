import { getCached, storeConversion } from "./cache";
import { formatConversionError } from "./errors";
import { buildHtmlDocument, generateNextJsProject } from "./generator";
import { parseFramerSite } from "./parser";
import { createZip } from "./zip";
import type { ConversionResult } from "./types";

export async function convertFramerToNextJs(url: string): Promise<ConversionResult> {
  const site = await parseFramerSite(url);
  const { files, assetCount } = await generateNextJsProject(site, {
    downloadAssets: false,
  });

  const cssSize = site.styles.reduce((sum, s) => sum + s.length, 0);

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
  const siteName = new URL(result.site.url).hostname.replace(/\./g, "-");
  const homePage =
    result.site.pages.find((p) => p.path === "/" || p.path === "") ||
    result.site.pages[0];
  const previewHtml = buildHtmlDocument(homePage, result.site);

  const previewId = await storeConversion({
    files: result.files,
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

export async function getPreviewHtml(id: string): Promise<string | null> {
  const entry = await getCached(id);
  return entry?.previewHtml ?? null;
}

export async function getCachedZip(
  id: string
): Promise<{ zip: Buffer; siteName: string; stats: ConversionResult["stats"] } | null> {
  const entry = await getCached(id);
  if (!entry) return null;
  const zip = await createZip(entry.files);
  return { zip, siteName: entry.siteName, stats: entry.stats };
}

export { formatConversionError, formatHttpError } from "./errors";
export { normalizeFramerUrl, isFramerUrl } from "./fetcher";
export type { ConversionResult, FramerSite } from "./types";