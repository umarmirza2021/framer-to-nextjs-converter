import * as cheerio from "cheerio";

/**
 * EXPERIMENT: remove Framer's JavaScript runtime from a converted page.
 *
 * Framer ships a heavy JS engine that hydrates the page and runs entrance
 * animations. Removing it eliminates the biggest mobile-performance cost
 * (main-thread blocking) — but also removes animations and JS interactions.
 *
 * Appear-animations start elements hidden (opacity:0) expecting JS to reveal
 * them, so we force those elements visible or the page would render blank.
 */
export function stripFramerRuntime(html: string): string {
  const $ = cheerio.load(html);

  // Remove the runtime + all the machinery that loads/feeds it.
  $('script[data-framer-bundle="main"]').remove();
  $('script[type="module"]').remove();
  $('link[rel="modulepreload"]').remove();
  $('script[type="framer/appear"]').remove();
  $("script[data-framer-appear-animation]").remove();
  $('script[type="framer/handover"]').remove();

  // Reveal anything the appear-animations would have hidden until JS ran.
  $("head").append(
    "<style id=\"__no_js_reveal\">" +
      "[data-framer-appear-id]{opacity:1 !important;transform:none !important;filter:none !important;}" +
      "</style>"
  );

  return $.html();
}

/**
 * Prioritize the likely LCP image and defer the rest:
 *  - first content image  -> fetchpriority=high + eager + a <link rel=preload>
 *  - first few (above-fold) -> stay eager
 *  - the rest             -> loading=lazy + decoding=async
 * Improves LCP without changing any visuals.
 */
export function optimizeImageLoading(html: string): string {
  const $ = cheerio.load(html);
  const imgs = $("body img").toArray();
  let preloadHref = "";

  imgs.forEach((el, index) => {
    const $img = $(el);
    const src = $img.attr("src") || "";

    if (index === 0 && src) {
      $img.attr("fetchpriority", "high");
      $img.attr("loading", "eager");
      preloadHref = src;
    } else if (index < 3) {
      $img.attr("loading", "eager"); // above-the-fold, don't defer
    } else if (!$img.attr("loading")) {
      $img.attr("loading", "lazy");
      $img.attr("decoding", "async");
    }
  });

  if (preloadHref) {
    $("head").append(
      `<link rel="preload" as="image" href="${preloadHref}" fetchpriority="high" />`
    );
  }

  return $.html();
}
