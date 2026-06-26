import * as cheerio from "cheerio";
import { applyBindings } from "./bindings";
import { getCMSItem, getCMSItems, getPageForCodegen } from "./client";
import type { CMSBinding, CMSLayerType, CMSPageType } from "./types";

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type DbBinding = {
  layerId: string;
  layerType: string;
  collectionId: string;
  fieldKey: string;
  pageType: string;
};

function toBindings(rows: DbBinding[]): CMSBinding[] {
  return rows.map((b) => ({
    layerId: b.layerId,
    layerType: b.layerType as CMSLayerType,
    collectionId: b.collectionId,
    fieldKey: b.fieldKey,
    pageType: b.pageType as CMSPageType,
  }));
}

function normalizeRoute(route: string): string {
  return route.replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Render an index (list) page: the repeating card is cloned once per published
 * item with its bound layers filled in, and each card links to its detail page.
 */
export async function renderCmsIndex(pageId: string): Promise<string> {
  const page = await getPageForCodegen(pageId);
  const bindings = toBindings(page.bindings);
  const items = await getCMSItems(page.collection.slug, { published: true });

  const $ = cheerio.load(page.template, null, false);
  const base = normalizeRoute(page.route);

  if (page.repeatLayerId) {
    const $card = $(`[data-framer-name="${esc(page.repeatLayerId)}"]`).first();
    if ($card.length) {
      const cardHtml = $.html($card);
      const rendered = items
        .map((item) => {
          const filled = applyBindings(cardHtml, item, bindings);
          const href = `/${base}/${item.slug}`.replace(/\/+/g, "/");
          return `<a href="${href}" style="display:contents;text-decoration:none;color:inherit">${filled}</a>`;
        })
        .join("\n");
      $card.replaceWith(rendered || "");
    }
  }

  return $.html();
}

/**
 * Render a detail page for one published item. Returns null when the item is
 * missing or unpublished (the route handler turns that into a 404).
 */
export async function renderCmsDetail(
  pageId: string,
  slug: string
): Promise<string | null> {
  const page = await getPageForCodegen(pageId);
  const item = await getCMSItem(page.collection.slug, slug);
  if (!item || !item.published) return null;

  const bindings = toBindings(page.bindings);
  return applyBindings(page.template, item, bindings);
}

/** Slugs of published items — used by generated detail pages for static params. */
export async function getDetailSlugs(pageId: string): Promise<string[]> {
  const page = await getPageForCodegen(pageId);
  const items = await getCMSItems(page.collection.slug, { published: true });
  return items.map((i) => i.slug);
}
