import * as cheerio from "cheerio";
import type { CMSBinding, CMSItem, CMSLayerType } from "./types";

/** A layer discovered in a Framer page, offered to the binding UI. */
export interface DetectedLayer {
  id: string; // stable identifier (Framer's data-framer-name)
  name: string; // human label shown in the binding editor
  type: "text" | "image" | "href" | "container";
  sample: string; // current static content (preview)
}

/** Escape a value for safe use inside a CSS attribute selector. */
function escapeAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Walk a Framer page's HTML and list its named layers so the admin can
 * choose which ones to bind. Framer names layers with `data-framer-name`.
 */
export function extractLayers(html: string): DetectedLayer[] {
  const $ = cheerio.load(html, null, false);
  const layers: DetectedLayer[] = [];
  const seen = new Set<string>();

  $("[data-framer-name]").each((_, el) => {
    const $el = $(el);
    const name = $el.attr("data-framer-name")?.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);

    const tag = "tagName" in el ? String(el.tagName).toLowerCase() : "";
    let type: DetectedLayer["type"];
    if (tag === "img" || $el.find("img").length > 0) type = "image";
    else if (tag === "a" || $el.find("a").length > 0) type = "href";
    else if ($el.children().length === 0 && $el.text().trim()) type = "text";
    else type = "container";

    const sample =
      type === "image"
        ? ($el.is("img") ? $el.attr("src") : $el.find("img").attr("src")) || ""
        : $el.text().trim().slice(0, 80);

    layers.push({ id: name, name, type, sample });
  });

  return layers;
}

/** Update a CSS `style` string's background-image, preserving the rest. */
function setBackgroundImage(style: string, url: string): string {
  const decl = `background-image: url("${url}")`;
  if (/background-image\s*:[^;]*/i.test(style)) {
    return style.replace(/background-image\s*:[^;]*/i, decl);
  }
  return style ? `${style.replace(/;?\s*$/, "")}; ${decl}` : decl;
}

function applyOne(
  $: cheerio.CheerioAPI,
  $target: cheerio.Cheerio<never>,
  layerType: CMSLayerType,
  value: string
): void {
  switch (layerType) {
    case "text": {
      $target.text(value);
      break;
    }
    case "image": {
      const $img = $target.is("img") ? $target : $target.find("img").first();
      if ($img.length) {
        $img.attr("src", value);
        $img.removeAttr("srcset"); // avoid the responsive set overriding our src
      }
      break;
    }
    case "background-image": {
      $target.attr("style", setBackgroundImage($target.attr("style") || "", value));
      break;
    }
    case "href": {
      const $a = $target.is("a") ? $target : $target.find("a").first();
      if ($a.length) $a.attr("href", value);
      break;
    }
  }
}

/**
 * Replace every bound layer in a Framer-converted HTML fragment with the
 * matching CMS field value for `item`. Missing/empty values fall back to the
 * original static Framer content (the binding is simply skipped).
 */
export function applyBindings(
  html: string,
  item: CMSItem,
  bindings: CMSBinding[]
): string {
  const $ = cheerio.load(html, null, false);

  for (const binding of bindings) {
    const raw = item.data[binding.fieldKey];
    if (raw === undefined || raw === null || raw === "") continue; // fallback to static

    const $target = $(`[data-framer-name="${escapeAttr(binding.layerId)}"]`).first();
    if (!$target.length) continue;

    applyOne($, $target as cheerio.Cheerio<never>, binding.layerType, String(raw));
  }

  return $.html();
}
