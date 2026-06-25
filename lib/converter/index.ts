import { getCached, storeConversion } from "./cache";
import { detectPlatform } from "./detect";
import { buildHtmlDocument, generateNextJsProject } from "./generator";
import { parseFramerSite } from "./parser";
import { normalizeSiteUrl, isValidHttpUrl } from "./shared/url";
import type {
  ConversionResult,
  FramerSite,
  Platform,
  WebflowSite,
} from "./types";
import { buildWebflowHtmlDocument, generateWebflowNextJsProject } from "./webflow/generator";
import { parseWebflowSite } from "./webflow/parser";
import { createZip } from "./zip";

export type ConvertOptions = {
  platform?: Platform | "auto";
};

async function resolvePlatform(
  url: string,
  platform: Platform | "auto"
): Promise<Platform> {
  if (platform !== "auto") return platform;
  const detected = await detectPlatform(url);
  if (!detected) {
    throw new Error(
      "Could not detect site platform. The URL must be a published Framer or Webflow site."
    );
  }
  return detected;
}

export async function convertToNextJs(
  url: string,
  options: ConvertOptions = {}
): Promise<ConversionResult> {
  const normalizedUrl = normalizeSiteUrl(url);
  const platform = await resolvePlatform(normalizedUrl, options.platform ?? "auto");

  if (platform === "framer") {
    const site = await parseFramerSite(normalizedUrl);
    const files = await generateNextJsProject(site);
    const cssSize = site.styles.reduce((sum, s) => sum + s.length, 0);
    const assetCount = Object.keys(files).filter((f) =>
      f.startsWith("public/assets/")
    ).length;

    return {
      platform: "framer",
      site,
      files,
      stats: { pages: site.pages.length, assets: assetCount, cssSize },
    };
  }

  const site = await parseWebflowSite(normalizedUrl);
  const files = await generateWebflowNextJsProject(site);
  const cssSize = site.inlineStyles.reduce((sum, s) => sum + s.length, 0);
  const assetCount = Object.keys(files).filter((f) =>
    f.startsWith("public/assets/")
  ).length;

  return {
    platform: "webflow",
    site,
    files,
    stats: { pages: site.pages.length, assets: assetCount, cssSize },
  };
}

export async function convertFramerToNextJs(url: string): Promise<ConversionResult> {
  return convertToNextJs(url, { platform: "framer" });
}

export async function convertWebflowToNextJs(url: string): Promise<ConversionResult> {
  return convertToNextJs(url, { platform: "webflow" });
}

export async function convertAndZip(
  url: string,
  options: ConvertOptions = {}
): Promise<{
  zip: Buffer;
  stats: ConversionResult["stats"];
  siteName: string;
  platform: Platform;
}> {
  const result = await convertToNextJs(url, options);
  const zip = await createZip(result.files);
  const siteName = new URL(
    result.platform === "framer"
      ? (result.site as FramerSite).url
      : (result.site as WebflowSite).url
  ).hostname.replace(/\./g, "-");

  return { zip, stats: result.stats, siteName, platform: result.platform };
}

function getSiteTitle(result: ConversionResult): string {
  if (result.platform === "framer") {
    return (result.site as FramerSite).meta.title;
  }
  return (result.site as WebflowSite).meta.title;
}

function buildPreviewHtml(result: ConversionResult): string {
  if (result.platform === "framer") {
    const site = result.site as FramerSite;
    const homePage =
      site.pages.find((p) => p.path === "/" || p.path === "") || site.pages[0];
    return buildHtmlDocument(homePage, site);
  }

  const site = result.site as WebflowSite;
  const homePage =
    site.pages.find((p) => p.path === "/" || p.path === "") || site.pages[0];
  return buildWebflowHtmlDocument(homePage, site);
}

export async function convertForPreview(
  url: string,
  options: ConvertOptions = {}
): Promise<{
  previewId: string;
  stats: ConversionResult["stats"];
  siteName: string;
  title: string;
  platform: Platform;
}> {
  const result = await convertToNextJs(url, options);
  const zip = await createZip(result.files);
  const siteUrl =
    result.platform === "framer"
      ? (result.site as FramerSite).url
      : (result.site as WebflowSite).url;
  const siteName = new URL(siteUrl).hostname.replace(/\./g, "-");
  const previewHtml = buildPreviewHtml(result);

  const previewId = storeConversion({
    zip,
    previewHtml,
    stats: result.stats,
    siteName,
    title: getSiteTitle(result),
  });

  return {
    previewId,
    stats: result.stats,
    siteName,
    title: getSiteTitle(result),
    platform: result.platform,
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

export function normalizeFramerUrl(input: string): string {
  return normalizeSiteUrl(input);
}

export function isFramerUrl(url: string): boolean {
  return isValidHttpUrl(url);
}

export { detectPlatform };
export type { ConversionResult, FramerSite, Platform, WebflowSite } from "./types";