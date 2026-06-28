export interface PageSpeedScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

/**
 * Run Google PageSpeed Insights (real Lighthouse) for a public URL on the given
 * device. No API key needed at low volume. Used to show before/after proof.
 */
export async function getPageSpeedScores(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedScores> {
  const api =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" +
    `url=${encodeURIComponent(url)}&strategy=${strategy}` +
    "&category=performance&category=accessibility&category=best-practices&category=seo" +
    (process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : "");

  const res = await fetch(api);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `PageSpeed failed (${res.status})`;
    if (res.status === 429 || /quota/i.test(msg)) {
      throw new Error(
        "PageSpeed rate limit reached. Add a free PAGESPEED_API_KEY (Google Cloud → PageSpeed Insights API) to enable measurements."
      );
    }
    throw new Error(msg);
  }

  const cats = data.lighthouseResult?.categories || {};
  const pct = (c: { score?: number } | undefined) =>
    c?.score != null ? Math.round(c.score * 100) : null;

  return {
    performance: pct(cats.performance),
    accessibility: pct(cats.accessibility),
    bestPractices: pct(cats["best-practices"]),
    seo: pct(cats.seo),
  };
}
