import type { FramerPage, FramerSite } from "./types";
import { downloadAsset } from "./fetcher";
import { extractAssetUrls } from "./html-to-jsx";

function slugify(path: string): string {
  if (path === "/" || path === "") return "home";
  return path.replace(/^\//, "").replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "page";
}

function toComponentName(path: string): string {
  const slug = slugify(path);
  return slug.charAt(0).toUpperCase() + slug.slice(1) + "Page";
}

function generateLayout(): string {
  return `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function generateGlobalsCss(site: FramerSite): string {
  const combined = site.styles.join("\n\n");
  return `/* Extracted from Framer site: ${site.url} */
/* Project ID: ${site.projectId} */

${combined}

/* Next.js overrides */
html, body {
  margin: 0;
  padding: 0;
}

#__framer-badge-container {
  display: none !important;
}
`;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeScriptContent(value: string): string {
  return value.replace(/<\/script>/gi, "<\\/script>");
}

export function buildHtmlDocument(page: FramerPage, site: FramerSite): string {
  const hydrateAttr = escapeHtmlAttr(
    JSON.stringify(page.hydrateData || { routeId: page.routeId || "", localeId: "default" })
  );

  const fontLinks = site.fonts
    .filter((f) => f.includes("fonts.googleapis.com"))
    .map((f) => `    <link href="${f}" rel="stylesheet" />`)
    .join("\n");

  const faviconLight = site.meta.faviconLight
    ? `    <link href="${site.meta.faviconLight}" rel="icon" media="(prefers-color-scheme: light)" />\n`
    : "";
  const faviconDark = site.meta.faviconDark
    ? `    <link href="${site.meta.faviconDark}" rel="icon" media="(prefers-color-scheme: dark)" />\n`
    : "";

  const preloads = site.modulePreloads
    .map(
      (href) =>
        `    <link rel="modulepreload" fetchpriority="low" href="${href}" />`
    )
    .join("\n");

  const combinedCss = site.styles.join("\n\n");

  const ssrReleased = page.ssrReleasedAt
    ? ` data-framer-ssr-released-at="${page.ssrReleasedAt}"`
    : "";
  const pageOptimized = page.pageOptimizedAt
    ? ` data-framer-page-optimized-at="${page.pageOptimizedAt}"`
    : "";

  const appearAnimations = page.appearAnimations
    ? `    <script type="framer/appear" id="__framer__appearAnimationsContent">${escapeScriptContent(page.appearAnimations)}</script>\n`
    : "";
  const appearBreakpoints = page.appearBreakpoints
    ? `    <script type="framer/appear" id="__framer__breakpoints">${escapeScriptContent(page.appearBreakpoints)}</script>\n`
    : "";
  const appearInit = page.appearInitScript
    ? `    <script data-framer-appear-animation="no-preference">${escapeScriptContent(page.appearInitScript)}</script>\n`
    : "";
  const handover = page.handoverData
    ? `    <script type="framer/handover" id="__framer__handoverData">${escapeScriptContent(page.handoverData)}</script>\n`
    : "";

  const mainBundle = site.scriptUrl
    ? `    <script type="module" async data-framer-bundle="main" fetchpriority="low" src="${site.scriptUrl}"></script>\n`
    : "";

  const ogImage = site.meta.ogImage
    ? `    <meta property="og:image" content="${site.meta.ogImage}" />\n`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content="Framer to Next.js Converter" />
    <title>${escapeHtmlAttr(page.title)}</title>
    <meta name="description" content="${escapeHtmlAttr(site.meta.description)}" />
${ogImage}    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${fontLinks}
${faviconLight}${faviconDark}${preloads}
    <style data-framer-css-ssr-minified>${combinedCss}

html, body { margin: 0; padding: 0; }
#__framer-badge-container { display: none !important; }
</style>
  </head>
  <body>
    <div id="main" data-framer-hydrate-v2="${hydrateAttr}"${ssrReleased}${pageOptimized}>
${page.html}
    </div>
${appearAnimations}${appearBreakpoints}${appearInit}${mainBundle}${handover}  </body>
</html>`;
}

function generateDocumentModule(docName: string, page: FramerPage, site: FramerSite): string {
  const html = buildHtmlDocument(page, site);
  return `export const framerHtml = ${JSON.stringify(html)};\n`;
}

function relativeImportPath(pagePath: string, docName: string): string {
  const segments =
    pagePath === "/" || pagePath === ""
      ? 0
      : pagePath.replace(/^\//, "").replace(/\/$/, "").split("/").length;
  const prefix = "../".repeat(segments + 1);
  return `${prefix}lib/framer/${docName}`;
}

function generateRouteHandler(docName: string, pagePath: string): string {
  const importPath = relativeImportPath(pagePath, docName);
  return `import { framerHtml } from "${importPath}";

export async function GET() {
  return new Response(framerHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
`;
}

function generatePackageJson(siteName: string): string {
  return JSON.stringify(
    {
      name: siteName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "^15.1.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/node": "^22.10.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.7.0",
      },
    },
    null,
    2
  );
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        baseUrl: ".",
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  );
}

function generateNetlifyToml(): string {
  return `[build]
  command = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
`;
}

function generateNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com" },
      { protocol: "https", hostname: "fonts.gstatic.com" },
    ],
  },
};

export default nextConfig;
`;
}

function generateReadme(site: FramerSite): string {
  return `# ${site.meta.title}

Converted from Framer to Next.js using [Framer to Next.js Converter](https://github.com).

**Source:** ${site.url}
**Project ID:** ${site.projectId}
**Pages:** ${site.pages.length}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Notes

- Styles were extracted from Framer's SSR output and included in \`app/globals.css\`.
- Images have been downloaded to \`public/assets/\` where possible.
- Pages are served as raw HTML via Route Handlers (\`app/route.ts\`) — zero React hydration, full Framer compatibility.
- React Strict Mode is disabled in \`next.config.ts\` because Framer animations can break with double-mounting.

## Customization

- Edit HTML documents in \`lib/framer/\`
- Override styles in the inline \`<style>\` block or \`app/globals.css\`
`;
}

export async function generateNextJsProject(
  site: FramerSite
): Promise<Record<string, string | Buffer>> {
  const files: Record<string, string | Buffer> = {};
  const siteName = new URL(site.url).hostname.replace(/\./g, "-");
  const assetMap = new Map<string, string>();

  const allHtml = site.pages.map((p) => p.html).join("") + site.styles.join("");
  const assetUrls = extractAssetUrls(allHtml);

  let assetIndex = 0;
  for (const url of assetUrls) {
    const buffer = await downloadAsset(url);
    if (!buffer) continue;

    const ext = url.split(".").pop()?.split("?")[0] || "bin";
    const filename = `asset-${assetIndex}.${ext}`;
    const localPath = `/assets/${filename}`;
    assetMap.set(url, localPath);
    files[`public/assets/${filename}`] = buffer;
    assetIndex++;
  }

  files["package.json"] = generatePackageJson(siteName);
  files["tsconfig.json"] = generateTsConfig();
  files["netlify.toml"] = generateNetlifyToml();
  files["next.config.ts"] = generateNextConfig();
  files["next-env.d.ts"] = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n';
  files["app/layout.tsx"] = generateLayout();
  files["app/globals.css"] = generateGlobalsCss(site);
  files["README.md"] = generateReadme(site);

  for (const page of site.pages) {
    const docName = toComponentName(page.path) + "Document";

    files[`lib/framer/${docName}.ts`] = generateDocumentModule(docName, page, site);
    files[
      page.path === "/" || page.path === ""
        ? "app/route.ts"
        : `app/${page.path.replace(/^\//, "").replace(/\/$/, "")}/route.ts`
    ] = generateRouteHandler(docName, page.path);
  }

  return files;
}