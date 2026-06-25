import type { WebflowPage, WebflowSite } from "../types";
import { downloadAsset } from "../fetcher";
import { extractAssetUrls } from "../html-to-jsx";

function slugify(path: string): string {
  if (path === "/" || path === "") return "home";
  return path.replace(/^\//, "").replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "page";
}

function toComponentName(path: string): string {
  const slug = slugify(path);
  return slug.charAt(0).toUpperCase() + slug.slice(1) + "Page";
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatHtmlAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}="${escapeHtmlAttr(value)}"`)
    .join(" ");
}

export function buildWebflowHtmlDocument(page: WebflowPage, site: WebflowSite): string {
  const htmlAttrs = formatHtmlAttrs(page.htmlAttrs);
  const bodyClass = page.bodyClass ? ` class="${escapeHtmlAttr(page.bodyClass)}"` : "";
  const ogImage = site.meta.ogImage
    ? `    <meta property="og:image" content="${escapeHtmlAttr(site.meta.ogImage)}" />\n`
    : "";

  const inlineCss = site.inlineStyles.length
    ? `    <style>${site.inlineStyles.join("\n\n")}

.w-webflow-badge, .w-webflow-badge * { display: none !important; visibility: hidden !important; }
</style>\n`
    : `    <style>.w-webflow-badge, .w-webflow-badge * { display: none !important; visibility: hidden !important; }</style>\n`;

  return `<!DOCTYPE html>
<html ${htmlAttrs}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Webflow to Next.js Converter" />
    <title>${escapeHtmlAttr(page.title)}</title>
    <meta name="description" content="${escapeHtmlAttr(site.meta.description)}" />
${ogImage}${page.headHtml}
${inlineCss}  </head>
  <body${bodyClass}>
${page.bodyHtml}
  </body>
</html>`;
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

function generateGlobalsCss(site: WebflowSite): string {
  return `/* Converted from Webflow site: ${site.url} */
/* Site ID: ${site.siteId} */

html, body {
  margin: 0;
  padding: 0;
}

.w-webflow-badge {
  display: none !important;
}
`;
}

function generateDocumentModule(docName: string, page: WebflowPage, site: WebflowSite): string {
  const html = buildWebflowHtmlDocument(page, site);
  return `export const webflowHtml = ${JSON.stringify(html)};\n`;
}

function relativeImportPath(pagePath: string, docName: string): string {
  const segments =
    pagePath === "/" || pagePath === ""
      ? 0
      : pagePath.replace(/^\//, "").replace(/\/$/, "").split("/").length;
  const prefix = "../".repeat(segments + 1);
  return `${prefix}lib/webflow/${docName}`;
}

function generateRouteHandler(docName: string, pagePath: string): string {
  const importPath = relativeImportPath(pagePath, docName);
  return `import { webflowHtml } from "${importPath}";

export async function GET() {
  return new Response(webflowHtml, {
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
        "@netlify/plugin-nextjs": "^5.15.0",
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
  publish = ".next"

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
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "uploads-ssl.webflow.com" },
      { protocol: "https", hostname: "assets.website-files.com" },
      { protocol: "https", hostname: "d3e54v103j8qbb.cloudfront.net" },
      { protocol: "https", hostname: "fonts.googleapis.com" },
      { protocol: "https", hostname: "fonts.gstatic.com" },
    ],
  },
};

export default nextConfig;
`;
}

function generateReadme(site: WebflowSite): string {
  return `# ${site.meta.title}

Converted from Webflow to Next.js.

**Source:** ${site.url}
**Site ID:** ${site.siteId}
**Pages:** ${site.pages.length}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Deploy to Netlify

1. Push this folder to GitHub and connect it in Netlify.
2. Build settings are read from \`netlify.toml\` (\`publish = ".next"\`).
3. Click **Deploy site**.

## Notes

- Pages are served as raw HTML via Route Handlers — Webflow interactions and animations preserved.
- Assets remain on Webflow CDN for reliability.
- React Strict Mode is disabled because Webflow JS can break with double-mounting.
`;
}

export async function generateWebflowNextJsProject(
  site: WebflowSite
): Promise<Record<string, string | Buffer>> {
  const files: Record<string, string | Buffer> = {};
  const siteName = new URL(site.url).hostname.replace(/\./g, "-");

  const allHtml =
    site.pages.map((p) => p.bodyHtml + p.headHtml).join("") +
    site.inlineStyles.join("");

  const assetUrls = extractAssetUrls(allHtml);
  let assetIndex = 0;

  for (const url of assetUrls) {
    const buffer = await downloadAsset(url);
    if (!buffer) continue;

    const ext = url.split(".").pop()?.split("?")[0] || "bin";
    const filename = `asset-${assetIndex}.${ext}`;
    files[`public/assets/${filename}`] = buffer;
    assetIndex++;
  }

  files["package.json"] = generatePackageJson(siteName);
  files["tsconfig.json"] = generateTsConfig();
  files["netlify.toml"] = generateNetlifyToml();
  files["next.config.ts"] = generateNextConfig();
  files["next-env.d.ts"] =
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n';
  files["app/layout.tsx"] = generateLayout();
  files["app/globals.css"] = generateGlobalsCss(site);
  files["README.md"] = generateReadme(site);

  for (const page of site.pages) {
    const docName = toComponentName(page.path) + "Document";
    files[`lib/webflow/${docName}.ts`] = generateDocumentModule(docName, page, site);
    files[
      page.path === "/" || page.path === ""
        ? "app/route.ts"
        : `app/${page.path.replace(/^\//, "").replace(/\/$/, "")}/route.ts`
    ] = generateRouteHandler(docName, page.path);
  }

  return files;
}