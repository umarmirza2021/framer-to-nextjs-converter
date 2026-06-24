import { generateNextJsProject } from "./generator";
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

export { normalizeFramerUrl, isFramerUrl } from "./fetcher";
export type { ConversionResult, FramerSite } from "./types";