import { extractLayers, type DetectedLayer } from "./bindings";

export interface PageAnalysis {
  route: string;
  framerPageId: string;
  suggestedType: "index" | "detail";
  /** A likely "repeating card" layer for index pages, if one stands out. */
  suggestedRepeatLayerId: string | null;
  layers: DetectedLayer[];
}

/**
 * Analyze a single converted Framer page to help the admin set up CMS bindings.
 *
 * NOTE: Framer does not expose its CMS field bindings in a stable, documented
 * way in published SSR HTML, so fully automatic binding is not reliable. This
 * surfaces the page's named layers and a best-guess page type; the admin
 * confirms collection + bindings in the Page & Binding Manager (manual setup,
 * which the data model fully supports).
 */
export function analyzeFramerPage(
  html: string,
  route: string,
  framerPageId: string
): PageAnalysis {
  const layers = extractLayers(html);

  // Routes with a dynamic-looking last segment are likely detail pages.
  const suggestedType: "index" | "detail" = /\[.+\]|:\w+/.test(route)
    ? "detail"
    : "index";

  // Heuristic: a container layer whose name hints at a repeating item/card.
  const repeatCandidate = layers.find(
    (l) =>
      l.type === "container" &&
      /(card|item|post|cell|row|tile|entry)/i.test(l.name)
  );

  return {
    route,
    framerPageId,
    suggestedType,
    suggestedRepeatLayerId: repeatCandidate?.id ?? null,
    layers,
  };
}
