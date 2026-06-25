import * as cheerio from "cheerio";
import type { WebflowMeta, WebflowPage, WebflowSite } from "../types";
import { normalizeSiteUrl } from "../shared/url";
import { fetchSitemapPaths, fetchWebflowPage } from "./fetcher";

const SKIP_HEAD_TAGS = new Set(["title", "base"]);

function extractMeta($: cheerio.CheerioAPI): WebflowMeta {
  return {
    title: $("title").first().text().trim() || "Webflow Site",
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "",
    ogImage:
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content"),
    canonical: $('link[rel="canonical"]').attr("href"),
    favicon:
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="icon"]').attr("href"),
  };
}

function extractHtmlAttrs($: cheerio.CheerioAPI): Record<string, string> {
  const attrs: Record<string, string> = {};
  const html = $("html");
  for (const [key, value] of Object.entries(html.attr() || {})) {
    if (value) attrs[key] = value;
  }
  return attrs;
}

function extractHeadHtml($: cheerio.CheerioAPI): string {
  const parts: string[] = [];
  $("head")
    .children()
    .each((_, el) => {
      const tag = "tagName" in el && typeof el.tagName === "string" ? el.tagName.toLowerCase() : "";
      if (!tag || SKIP_HEAD_TAGS.has(tag)) return;
      parts.push($.html(el) || "");
    });
  return parts.join("\n");
}

function extractInlineStyles($: cheerio.CheerioAPI): string[] {
  const styles: string[] = [];
  $("style").each((_, el) => {
    const content = $(el).html();
    if (content?.trim()) styles.push(content);
  });
  return styles;
}

function parseWebflowPage(html: string, path: string): WebflowPage {
  const $ = cheerio.load(html);
  const htmlAttrs = extractHtmlAttrs($);

  return {
    path,
    pageId: htmlAttrs["data-wf-page"],
    title: $("title").first().text().trim() || "Page",
    bodyClass: $("body").attr("class"),
    htmlAttrs,
    headHtml: extractHeadHtml($),
    bodyHtml: $("body").html() || "",
  };
}

export async function parseWebflowSite(inputUrl: string): Promise<WebflowSite> {
  const baseUrl = normalizeSiteUrl(inputUrl);
  const html = await fetchWebflowPage(baseUrl);
  const $ = cheerio.load(html);

  const siteId = $("html").attr("data-wf-site");
  if (!siteId) {
    throw new Error("Could not detect Webflow site ID. Is this a published Webflow site?");
  }

  const meta = extractMeta($);
  const inlineStyles = extractInlineStyles($);

  const pages: WebflowPage[] = [parseWebflowPage(html, "/")];
  const sitemapPaths = await fetchSitemapPaths(baseUrl);
  const origin = new URL(baseUrl).origin;

  for (const pagePath of sitemapPaths) {
    if (pagePath === "/" || pagePath === "") continue;

    try {
      const pageUrl = `${origin}${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;
      const pageHtml = await fetchWebflowPage(pageUrl);
      pages.push(parseWebflowPage(pageHtml, pagePath));
    } catch {
      // Skip pages that fail to load
    }
  }

  const uniquePages = new Map<string, WebflowPage>();
  for (const page of pages) {
    const key = page.path.endsWith("/") ? page.path : `${page.path}/`;
    uniquePages.set(key, { ...page, path: key });
  }

  return {
    url: baseUrl,
    siteId,
    meta,
    pages: Array.from(uniquePages.values()),
    inlineStyles,
  };
}