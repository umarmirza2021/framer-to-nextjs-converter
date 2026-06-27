const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const ATTR_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  autofocus: "autoFocus",
  autocomplete: "autoComplete",
  enctype: "encType",
  formaction: "formAction",
  formenctype: "formEncType",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  srcset: "srcSet",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  "accept-charset": "acceptCharset",
  "http-equiv": "httpEquiv",
};

function escapeJsxText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

function formatStyleKey(prop: string): string {
  if (prop.startsWith("--")) {
    return `"${prop}"`;
  }
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseStyleString(style: string): string {
  const props: string[] = [];
  const declarations = style.split(";").filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (!prop || !value) continue;

    const key = formatStyleKey(prop);
    const escapedValue = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    props.push(`${key}: "${escapedValue}"`);
  }

  if (!props.length) return "{{}}";
  return `{{ ${props.join(", ")} }}`;
}

function convertAttributes(attrs: string): string {
  if (!attrs.trim()) return "";

  const result: string[] = [];
  const attrRegex = /([a-zA-Z_:][\w:.-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";

    if (name.startsWith("on") || name === "xmlns" || name.startsWith("data-framer-")) {
      continue;
    }

    const jsxName = ATTR_MAP[name] ?? name;

    if (name === "style" && value) {
      result.push(`style=${parseStyleString(value)}`);
      continue;
    }

    if (value === "" && !VOID_ELEMENTS.has(name)) {
      result.push(jsxName);
      continue;
    }

    if (value === "" || value === name) {
      result.push(`${jsxName}={true}`);
      continue;
    }

    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    result.push(`${jsxName}="${escaped}"`);
  }

  return result.length ? " " + result.join(" ") : "";
}

function convertNode(html: string, depth = 0): string {
  const indent = "  ".repeat(depth);
  let result = "";
  let i = 0;

  while (i < html.length) {
    if (html[i] === "<") {
      if (html[i + 1] === "!") {
        const endIdx = html.indexOf("-->", i);
        i = endIdx === -1 ? html.length : endIdx + 3;
        continue;
      }

      if (html[i + 1] === "?") {
        const endIdx = html.indexOf("?>", i);
        i = endIdx === -1 ? html.length : endIdx + 2;
        continue;
      }

      const closeMatch = html.slice(i).match(/^<\/([a-zA-Z][\w-]*)>/);
      if (closeMatch) {
        return result;
      }

      const openMatch = html.slice(i).match(/^<([a-zA-Z][\w-]*)\s*([^>]*?)(\/?)>/);
      if (!openMatch) {
        i++;
        continue;
      }

      const tag = openMatch[1].toLowerCase();
      const attrStr = openMatch[2];
      const selfClosing = openMatch[3] === "/" || VOID_ELEMENTS.has(tag);
      const attrJsx = convertAttributes(attrStr);

      if (selfClosing) {
        result += `${indent}<${tag}${attrJsx} />\n`;
        i += openMatch[0].length;
        continue;
      }

      const closeTag = `</${tag}>`;
      const closeIdx = findClosingTag(html, tag, i + openMatch[0].length);

      if (closeIdx === -1) {
        result += `${indent}<${tag}${attrJsx} />\n`;
        i += openMatch[0].length;
        continue;
      }

      const innerHtml = html.slice(i + openMatch[0].length, closeIdx);
      const hasOnlyText = !innerHtml.includes("<");

      if (hasOnlyText) {
        const text = innerHtml.trim();
        if (text) {
          result += `${indent}<${tag}${attrJsx}>${escapeJsxText(text)}</${tag}>\n`;
        } else {
          result += `${indent}<${tag}${attrJsx} />\n`;
        }
      } else {
        const children = convertNode(innerHtml, depth + 1);
        if (children.trim()) {
          result += `${indent}<${tag}${attrJsx}>\n${children}${indent}</${tag}>\n`;
        } else {
          result += `${indent}<${tag}${attrJsx} />\n`;
        }
      }

      i = closeIdx + closeTag.length;
      continue;
    }

    const textEnd = html.indexOf("<", i);
    const textContent = (textEnd === -1 ? html.slice(i) : html.slice(i, textEnd)).trim();
    if (textContent) {
      result += `${indent}${escapeJsxText(textContent)}\n`;
    }
    i = textEnd === -1 ? html.length : textEnd;
  }

  return result;
}

function findClosingTag(html: string, tag: string, start: number): number {
  const openPattern = new RegExp(`<${tag}[\\s>]`, "gi");
  const closePattern = new RegExp(`</${tag}>`, "gi");
  let depth = 1;
  let pos = start;

  while (depth > 0 && pos < html.length) {
    openPattern.lastIndex = pos;
    closePattern.lastIndex = pos;

    const nextOpen = openPattern.exec(html);
    const nextClose = closePattern.exec(html);

    if (!nextClose) return -1;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) return nextClose.index;
      pos = nextClose.index + nextClose[0].length;
    }
  }

  return -1;
}

export function htmlToJsx(html: string): string {
  let cleaned = html
    .replace(/<!--\$-->/g, "")
    .replace(/<!--\/\$-->/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div id="__framer-badge-container"[\s\S]*?<\/div>/gi, "");

  return convertNode(cleaned).trim();
}

// Strip surrounding quotes/whitespace and any query string from a captured URL.
function cleanUrl(raw: string): string {
  return raw.trim().replace(/^['"]|['"]$/g, "").split("?")[0];
}

export function extractAssetUrls(html: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /src="(https:\/\/framerusercontent\.com[^"]+)"/g,
    /srcset="([^"]+)"/g,
    // CSS url() — may be quoted: url("…"), url('…'), or url(…). Includes fonts.
    /url\((['"]?https:\/\/framerusercontent\.com[^)]+?['"]?)\)/g,
    /href="(https:\/\/framerusercontent\.com[^"]+\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf))"/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1];
      if (value.includes(",") && value.includes(" ")) {
        // srcset: comma-separated "url 512w" descriptors
        value.split(",").forEach((part) => {
          const url = part.trim().split(/\s+/)[0];
          if (url.startsWith("https://")) urls.add(cleanUrl(url));
        });
      } else {
        const url = cleanUrl(value);
        if (url.startsWith("https://")) urls.add(url);
      }
    }
  }

  return Array.from(urls);
}

export function localizeAssets(content: string, assetMap: Map<string, string>): string {
  let result = content;
  for (const [remote, local] of assetMap) {
    result = result.split(remote).join(local);
    const withParams = remote + "?";
    const regex = new RegExp(remote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\?[^\"'\\s\)]*", "g");
    result = result.replace(regex, local);
  }
  return result;
}