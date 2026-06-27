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
