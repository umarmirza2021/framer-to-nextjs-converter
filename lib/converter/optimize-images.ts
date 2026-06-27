import sharp from "sharp";
import { downloadAsset } from "./fetcher";
import { extractAssetUrls } from "./html-to-jsx";
import type { FramerSite } from "./types";

const MAX_WIDTH = 1920; // no design needs more than this on the web
const WEBP_QUALITY = 76; // visually lossless-ish, big byte savings

export interface OptimizeResult {
  /** remote Framer URL -> local path (e.g. /assets/img-3.webp) */
  assetMap: Map<string, string>;
  /** files to include in the project (public/assets/...) */
  files: Record<string, Buffer>;
  stats: {
    count: number;
    originalBytes: number;
    optimizedBytes: number;
    savedPercent: number;
  };
}

function extOf(url: string): string {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? `.${m[1].toLowerCase()}` : ".img";
}

function isRaster(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

async function mapWithConcurrency<T>(
  items: string[],
  limit: number,
  fn: (item: string, index: number) => Promise<T>
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

/**
 * Download every image referenced by the site and re-encode rasters to WebP
 * (resized to a sane max width). Returns a map for rewriting the HTML/CSS, the
 * optimized files to bundle, and before/after byte stats to prove the win.
 */
export async function optimizeSiteImages(
  site: FramerSite,
  concurrency = 6
): Promise<OptimizeResult> {
  const urlSet = new Set<string>();
  for (const page of site.pages) extractAssetUrls(page.html).forEach((u) => urlSet.add(u));
  for (const style of site.styles) extractAssetUrls(style).forEach((u) => urlSet.add(u));

  const urls = Array.from(urlSet);
  const assetMap = new Map<string, string>();
  const files: Record<string, Buffer> = {};
  let originalBytes = 0;
  let optimizedBytes = 0;
  let count = 0;

  await mapWithConcurrency(urls, concurrency, async (url, i) => {
    const buf = await downloadAsset(url);
    if (!buf) return;

    if (isRaster(url)) {
      try {
        const webp = await sharp(buf)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        // Only keep the WebP if it's actually smaller than the original.
        const useWebp = webp.length < buf.length;
        const finalBuf = useWebp ? webp : buf;
        const local = `/assets/img-${i}.${useWebp ? "webp" : extOf(url).slice(1)}`;
        files[`public${local}`] = finalBuf;
        assetMap.set(url, local);
        originalBytes += buf.length;
        optimizedBytes += finalBuf.length;
        count++;
        return;
      } catch {
        // sharp can't handle it (e.g. corrupt) — fall through to self-host as-is.
      }
    }

    // Non-raster (svg/gif/etc.) or sharp failure: self-host unchanged.
    const local = `/assets/img-${i}${extOf(url)}`;
    files[`public${local}`] = buf;
    assetMap.set(url, local);
    originalBytes += buf.length;
    optimizedBytes += buf.length;
    count++;
  });

  const savedPercent =
    originalBytes > 0
      ? Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100)
      : 0;

  return {
    assetMap,
    files,
    stats: { count, originalBytes, optimizedBytes, savedPercent },
  };
}
