export interface FramerMeta {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  faviconLight?: string;
  faviconDark?: string;
}

export interface FramerHydrateData {
  routeId: string;
  localeId: string;
  breakpoints?: Array<{ hash: string; mediaQuery: string }>;
  [key: string]: unknown;
}

export interface FramerPage {
  path: string;
  routeId?: string;
  hydrateData?: FramerHydrateData;
  ssrReleasedAt?: string;
  pageOptimizedAt?: string;
  appearAnimations?: string;
  appearBreakpoints?: string;
  appearInitScript?: string;
  handoverData?: string;
  title: string;
  html: string;
}

export interface FramerSite {
  url: string;
  projectId: string;
  meta: FramerMeta;
  pages: FramerPage[];
  styles: string[];
  scriptUrl?: string;
  modulePreloads: string[];
  fonts: string[];
}

export type Platform = "framer" | "webflow";

export interface WebflowMeta {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  favicon?: string;
}

export interface WebflowPage {
  path: string;
  pageId?: string;
  title: string;
  bodyClass?: string;
  htmlAttrs: Record<string, string>;
  headHtml: string;
  bodyHtml: string;
}

export interface WebflowSite {
  url: string;
  siteId: string;
  meta: WebflowMeta;
  pages: WebflowPage[];
  inlineStyles: string[];
}

export interface ConversionResult {
  platform: Platform;
  site: FramerSite | WebflowSite;
  files: Record<string, string | Buffer>;
  stats: {
    pages: number;
    assets: number;
    cssSize: number;
  };
}