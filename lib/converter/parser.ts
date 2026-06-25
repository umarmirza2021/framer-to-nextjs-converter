import * as cheerio from "cheerio";
import type { FramerHydrateData, FramerMeta, FramerPage, FramerSite } from "./types";
import { fetchFramerPage, fetchSearchIndex, normalizeFramerUrl } from "./fetcher";
import { mapWithConcurrency } from "./shared/concurrency";

const MAX_PAGES = 25;
const PAGE_FETCH_CONCURRENCY = 6;

function extractProjectId(html: string): string | null {
  const match = html.match(/framerusercontent\.com\/sites\/([a-zA-Z0-9]+)\//);
  return match?.[1] ?? null;
}

function extractMeta($: cheerio.CheerioAPI): FramerMeta {
  return {
    title: $("title").text() || "Framer Site",
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "",
    ogImage: $('meta[property="og:image"]').attr("content"),
    canonical: $('link[rel="canonical"]').attr("href"),
    faviconLight: $('link[rel="icon"][media*="light"]').attr("href"),
    faviconDark: $('link[rel="icon"][media*="dark"]').attr("href"),
  };
}

function extractStyles($: cheerio.CheerioAPI): string[] {
  const styles: string[] = [];
  $("style").each((_, el) => {
    const content = $(el).html();
    if (content) styles.push(content);
  });
  return styles;
}

function extractMainHtml($: cheerio.CheerioAPI): string {
  const main = $("#main");
  if (main.length) {
    return main.html() || "";
  }
  return $("body").html() || "";
}

function extractScriptUrl($: cheerio.CheerioAPI, html: string): string | undefined {
  const bundled = $('script[data-framer-bundle="main"]').attr("src");
  if (bundled) return bundled;

  const moduleScript = $('script[type="module"][src*="script_main"]').attr("src");
  if (moduleScript) return moduleScript;

  const legacyScript = $('script[type="module"][src*="script.mjs"]').attr("src");
  if (legacyScript) return legacyScript;

  const match = html.match(
    /src="([^"]*(?:script_main[^"]*\.mjs|\/script\.mjs)[^"]*)"/
  );
  return match?.[1];
}

function extractModulePreloads($: cheerio.CheerioAPI): string[] {
  const preloads: string[] = [];
  $('link[rel="modulepreload"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) preloads.push(href);
  });
  return preloads;
}

function extractFonts(html: string): string[] {
  const fonts = new Set<string>();
  const linkMatches = html.matchAll(/href="(https:\/\/fonts\.googleapis\.com[^"]+)"/g);
  for (const match of linkMatches) {
    fonts.add(match[1]);
  }
  const gstaticMatches = html.matchAll(/href="(https:\/\/fonts\.gstatic\.com[^"]*)"/g);
  for (const match of gstaticMatches) {
    fonts.add(match[1]);
  }
  return Array.from(fonts);
}

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractHydrateData($: cheerio.CheerioAPI): FramerHydrateData | undefined {
  const main = $("#main");
  const hydrateData = main.attr("data-framer-hydrate-v2");
  if (!hydrateData) return undefined;
  try {
    return JSON.parse(decodeHtmlAttr(hydrateData)) as FramerHydrateData;
  } catch {
    return undefined;
  }
}

function extractMainAttributes($: cheerio.CheerioAPI) {
  const main = $("#main");
  return {
    ssrReleasedAt: main.attr("data-framer-ssr-released-at"),
    pageOptimizedAt: main.attr("data-framer-page-optimized-at"),
  };
}

function extractInlineScript($: cheerio.CheerioAPI, id: string): string | undefined {
  const script = $(`script#${id}`);
  const content = script.html();
  return content?.trim() || undefined;
}

function extractAppearInitScript(html: string): string | undefined {
  const match = html.match(
    /<script data-framer-appear-animation[^>]*>([\s\S]*?)<\/script>/
  );
  return match?.[1]?.trim() || undefined;
}

function extractSearchIndexUrl($: cheerio.CheerioAPI): string | undefined {
  return $('meta[name="framer-search-index"]').attr("content");
}

function parsePageHtml(html: string, path: string): FramerPage {
  const $ = cheerio.load(html);
  const hydrateData = extractHydrateData($);
  const mainAttrs = extractMainAttributes($);

  return {
    path,
    routeId: hydrateData?.routeId,
    hydrateData,
    ssrReleasedAt: mainAttrs.ssrReleasedAt,
    pageOptimizedAt: mainAttrs.pageOptimizedAt,
    appearAnimations: extractInlineScript($, "__framer__appearAnimationsContent"),
    appearBreakpoints: extractInlineScript($, "__framer__breakpoints"),
    appearInitScript: extractAppearInitScript(html),
    handoverData: extractInlineScript($, "__framer__handoverData"),
    title: $("title").text() || "Page",
    html: extractMainHtml($),
  };
}

export async function parseFramerSite(inputUrl: string): Promise<FramerSite> {
  const baseUrl = normalizeFramerUrl(inputUrl);
  const html = await fetchFramerPage(baseUrl);
  const $ = cheerio.load(html);

  const projectId = extractProjectId(html);
  if (!projectId) {
    throw new Error("Could not detect Framer project ID. Is this a published Framer site?");
  }

  const meta = extractMeta($);
  const styles = extractStyles($);
  const scriptUrl = extractScriptUrl($, html);
  const modulePreloads = extractModulePreloads($);
  const fonts = extractFonts(html);

  const hydrateData = extractHydrateData($);
  const mainAttrs = extractMainAttributes($);

  const pages: FramerPage[] = [
    {
      path: "/",
      routeId: hydrateData?.routeId,
      hydrateData,
      ssrReleasedAt: mainAttrs.ssrReleasedAt,
      pageOptimizedAt: mainAttrs.pageOptimizedAt,
      appearAnimations: extractInlineScript($, "__framer__appearAnimationsContent"),
      appearBreakpoints: extractInlineScript($, "__framer__breakpoints"),
      appearInitScript: extractAppearInitScript(html),
      handoverData: extractInlineScript($, "__framer__handoverData"),
      title: meta.title,
      html: extractMainHtml($),
    },
  ];

  const searchIndexUrl = extractSearchIndexUrl($);
  const searchIndexFallback = $('meta[name="framer-search-index-fallback"]').attr(
    "content"
  );
  let indexPaths: string[] = [];
  if (searchIndexUrl) {
    indexPaths = await fetchSearchIndex(searchIndexUrl);
  }
  if (!indexPaths.length && searchIndexFallback) {
    indexPaths = await fetchSearchIndex(searchIndexFallback);
  }

  if (indexPaths.length) {
    const origin = new URL(baseUrl).origin;
    const extraPaths = indexPaths
      .filter((pagePath) => pagePath !== "/" && pagePath !== "")
      .slice(0, MAX_PAGES - 1);

    const extraPages = await mapWithConcurrency(
      extraPaths,
      PAGE_FETCH_CONCURRENCY,
      async (pagePath) => {
        try {
          const pageUrl = `${origin}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;
          const pageHtml = await fetchFramerPage(pageUrl);
          return parsePageHtml(pageHtml, pagePath);
        } catch {
          return null;
        }
      }
    );

    for (const page of extraPages) {
      if (page) pages.push(page);
    }
  }

  return {
    url: baseUrl,
    projectId,
    meta,
    pages,
    styles,
    scriptUrl,
    modulePreloads,
    fonts,
    searchIndexUrl: searchIndexUrl || searchIndexFallback,
    bootstrapHtml: html,
  };
}