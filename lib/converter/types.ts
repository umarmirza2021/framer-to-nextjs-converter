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
  searchIndexUrl?: string;
  /** Full HTML of the homepage — used for CMS script discovery */
  bootstrapHtml?: string;
}

export interface ConversionResult {
  site: FramerSite;
  files: Record<string, string | Buffer>;
  stats: {
    pages: number;
    assets: number;
    cssSize: number;
  };
}