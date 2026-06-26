// Build a static, ready-to-serve site bundle from a generated Next.js project.
//
// The converted site is a static HTML snapshot (it hydrates from Framer's CDN
// at runtime), so it does not need a Next.js build. Netlify/Vercel "direct zip"
// uploads serve files as-is, so we must hand them real .html files — not the
// app/route.ts source — or the site root 404s.

type Files = Record<string, string | Buffer>;

// Matches: export const framerHtml = "...";  (a JSON.stringify'd string literal,
// always single-line because JSON.stringify escapes newlines as \n)
const FRAMER_HTML_RE = /export const framerHtml = ("(?:\\.|[^"\\])*")/;

function asString(content: string | Buffer): string {
  return typeof content === "string" ? content : content.toString("utf8");
}

/**
 * Convert a generated Next.js project into a flat static site:
 *   app/route.ts            -> index.html
 *   app/about/route.ts      -> about/index.html
 *   app/blog/post/route.ts  -> blog/post/index.html
 *   public/assets/x.png     -> assets/x.png
 */
export function buildStaticBundle(files: Files): Files {
  const out: Files = {};

  for (const [key, content] of Object.entries(files)) {
    const routeMatch = key.match(/^app\/(.*\/)?route\.ts$/);
    if (!routeMatch) continue;

    const dir = routeMatch[1] ? routeMatch[1].replace(/\/$/, "") : "";
    const routeSrc = asString(content);

    // Find which lib/framer/<Doc> this route renders (doc names may contain
    // hyphens for hyphenated routes, e.g. Blog-postPageDocument).
    const importMatch = routeSrc.match(/lib\/framer\/([A-Za-z0-9_-]+)"/);
    if (!importMatch) continue;

    const docSrc = files[`lib/framer/${importMatch[1]}.ts`];
    if (!docSrc) continue;

    const htmlMatch = asString(docSrc).match(FRAMER_HTML_RE);
    if (!htmlMatch) continue;

    let html: string;
    try {
      html = JSON.parse(htmlMatch[1]) as string;
    } catch {
      continue;
    }

    out[dir ? `${dir}/index.html` : "index.html"] = html;
  }

  // Carry over any bundled static assets (served from the site root).
  for (const [key, content] of Object.entries(files)) {
    if (key.startsWith("public/")) {
      out[key.slice("public/".length)] = content;
    }
  }

  // Guarantee a homepage so the root never 404s.
  if (!out["index.html"]) {
    const firstPage = Object.keys(out).find((k) => k.endsWith("index.html"));
    if (firstPage) out["index.html"] = out[firstPage];
  }

  return out;
}
