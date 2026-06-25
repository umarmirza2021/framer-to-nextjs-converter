const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_SITEMAP_PAGES = 30;

export function isWebflowHtml(html: string): boolean {
  return (
    html.includes("This site was created in Webflow") ||
    /data-wf-site=["']/.test(html) ||
    /name=["']generator["'][^>]*content=["']Webflow["']/i.test(html) ||
    /content=["']Webflow["'][^>]*name=["']generator["']/i.test(html)
  );
}

export async function fetchWebflowPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  if (!isWebflowHtml(html)) {
    throw new Error(
      "This URL does not appear to be a published Webflow site. Make sure the site is live and published."
    );
  }

  return html;
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function isSameSite(baseUrl: string, locUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const loc = new URL(locUrl);
    return normalizeHost(base.hostname) === normalizeHost(loc.hostname);
  } catch {
    return false;
  }
}

export async function fetchSitemapPaths(baseUrl: string): Promise<string[]> {
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return ["/"];

    const xml = await response.text();
    const paths = new Set<string>();

    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        if (!isSameSite(baseUrl, match[1])) continue;
        const loc = new URL(match[1]);
        const path = loc.pathname || "/";
        paths.add(path.endsWith("/") ? path : `${path}/`);
      } catch {
        continue;
      }
    }

    if (!paths.size) return ["/"];
    return Array.from(paths).slice(0, MAX_SITEMAP_PAGES);
  } catch {
    return ["/"];
  }
}