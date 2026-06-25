import type { FramerSite } from "@/lib/converter/types";
import { fetchFramerPage } from "@/lib/converter/fetcher";
import { filterSystemFields, stripSystemFieldValues } from "@/lib/cms/system-fields";
import { slugify, type CmsFieldType } from "@/lib/cms/types";

export interface DetectedCmsField {
  name: string;
  slug: string;
  type: CmsFieldType;
  framerFieldId: string;
  required?: boolean;
  options?: string[];
  refCollectionId?: string;
  refCollectionSlug?: string;
}

export interface DetectedCmsEntry {
  slug: string;
  values: Record<string, unknown>;
  published: boolean;
}

export interface DetectedCmsCollection {
  name: string;
  slug: string;
  framerCollectionId: string;
  fields: DetectedCmsField[];
  entries: DetectedCmsEntry[];
}

export type CmsDetectionStatus = "found" | "no_cms" | "parse_failed";

export interface CmsDetectionResult {
  collections: DetectedCmsCollection[];
  status: CmsDetectionStatus;
  message: string;
  collectionUtilsFound: number;
  dataModulesFound: number;
}

const FRAMER_RUNTIME_TYPE_MAP: Record<string, CmsFieldType> = {
  String: "PLAIN_TEXT",
  RichText: "FORMATTED_TEXT",
  FormattedText: "FORMATTED_TEXT",
  Boolean: "TOGGLE",
  Color: "COLOR",
  Number: "NUMBER",
  ResponsiveImage: "IMAGE",
  Image: "IMAGE",
  File: "FILE",
  Link: "LINK",
  Date: "DATE",
  Enum: "OPTION",
  CollectionReference: "REFERENCE",
  MultiCollectionReference: "MULTI_REFERENCE",
  Array: "GALLERY",
  Gallery: "GALLERY",
  VectorSet: "VECTOR_SET",
  Divider: "DIVIDER",
  Unsupported: "PLAIN_TEXT",
};

const FRAMER_LITERAL_TYPE_MAP: Record<string, CmsFieldType> = {
  string: "PLAIN_TEXT",
  formattedText: "FORMATTED_TEXT",
  boolean: "TOGGLE",
  color: "COLOR",
  number: "NUMBER",
  image: "IMAGE",
  file: "FILE",
  link: "LINK",
  date: "DATE",
  enum: "OPTION",
  collectionReference: "REFERENCE",
  multiCollectionReference: "MULTI_REFERENCE",
  array: "GALLERY",
  unsupported: "PLAIN_TEXT",
};

interface ParsedFramerField {
  id: string;
  name: string;
  type: CmsFieldType;
  required?: boolean;
  options?: string[];
  refCollectionId?: string;
}

interface ParsedFramerCollection {
  name: string;
  framerCollectionId: string;
  slugFieldId: string;
  fields: ParsedFramerField[];
  entries: DetectedCmsEntry[];
  sourceFieldCount: number;
}

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { Accept: "*/*" } });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function siteModuleBases(site: FramerSite): string[] {
  const bases = new Set<string>();
  bases.add(`https://framerusercontent.com/sites/${site.projectId}/`);

  try {
    const origin = new URL(site.url).origin;
    bases.add(`${origin}/`);
  } catch {
    // ignore invalid site url
  }

  return [...bases];
}

function resolveModuleUrl(base: string, modulePath: string): string {
  const cleaned = modulePath.replace(/^\.\//, "");
  return new URL(cleaned, base).href;
}

async function fetchTextFromBases(bases: string[], modulePath: string): Promise<string> {
  for (const base of bases) {
    const text = await fetchText(resolveModuleUrl(base, modulePath));
    if (text && !text.startsWith("<?xml") && text.length > 10) {
      return text;
    }
  }
  return "";
}

function extractQuotedModules(source: string): string[] {
  const modules = new Set<string>();
  const patterns = [
    /import\s*\(\s*["'`](\.\/[^"'`]+)["'`]\s*\)/g,
    /from\s*["'`](\.\/[^"'`]+)["'`]/g,
    /["'`](\.\/data-module\.[^"'`]+)["'`]/g,
    /["'`](\.\/chunk-[^"'`]+)["'`]/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      modules.add(match[1].replace(/^\.\//, ""));
    }
  }

  return [...modules];
}

function resolveScriptUrl(site: FramerSite, scriptRef: string): string {
  if (scriptRef.startsWith("http://") || scriptRef.startsWith("https://")) {
    return scriptRef;
  }

  const siteOrigin = new URL(site.url).origin;
  if (scriptRef.startsWith("/")) {
    return `${siteOrigin}${scriptRef}`;
  }

  return `${siteOrigin}/${scriptRef}`;
}

function extractScriptRefsFromHtml(html: string): string[] {
  const refs: string[] = [];
  const patterns = [
    /src="([^"]*(?:script_main[^"]*\.mjs|script\.mjs)[^"]*)"/g,
    /href="([^"]*(?:script_main[^"]*\.mjs|script\.mjs)[^"]*)"/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      refs.push(match[1]);
    }
  }

  return refs;
}

async function discoverScriptSources(site: FramerSite): Promise<string[]> {
  const bases = siteModuleBases(site);
  const scriptCandidates = new Set<string>();

  if (site.scriptUrl) scriptCandidates.add(site.scriptUrl);

  for (const preload of site.modulePreloads) {
    if (preload.includes("script_main") || preload.endsWith("script.mjs")) {
      scriptCandidates.add(preload);
    }
  }

  const htmlSources = [
    site.bootstrapHtml,
    ...site.pages.map((page) => page.html),
  ].filter(Boolean) as string[];

  for (const html of htmlSources) {
    for (const ref of extractScriptRefsFromHtml(html)) {
      scriptCandidates.add(resolveScriptUrl(site, ref));
    }
  }

  const scriptTexts: string[] = [];
  const fetchedModules = new Map<string, string>();

  async function fetchModule(moduleRef: string): Promise<string> {
    if (moduleRef.startsWith("http://") || moduleRef.startsWith("https://")) {
      if (fetchedModules.has(moduleRef)) return fetchedModules.get(moduleRef)!;
      const text = await fetchText(moduleRef);
      fetchedModules.set(moduleRef, text);
      return text;
    }

    const cacheKey = `rel:${moduleRef}`;
    if (fetchedModules.has(cacheKey)) return fetchedModules.get(cacheKey)!;

    const text = await fetchTextFromBases(bases, moduleRef);
    fetchedModules.set(cacheKey, text);
    return text;
  }

  for (const scriptUrl of scriptCandidates) {
    const resolved = resolveScriptUrl(site, scriptUrl);
    const text = await fetchModule(resolved);
    if (text && !text.startsWith("<?xml") && text.includes("import")) {
      scriptTexts.push(text);
    }
  }

  const queue = [...scriptTexts.flatMap((text) => extractQuotedModules(text))];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const moduleRef = queue.shift()!;
    if (seen.has(moduleRef)) continue;
    seen.add(moduleRef);

    const text = await fetchModule(moduleRef);
    if (!text || text.startsWith("<?xml")) continue;

    if (
      moduleRef.includes("script_main") ||
      moduleRef === "script.mjs" ||
      moduleRef.includes("data-module")
    ) {
      scriptTexts.push(text);
    }

    for (const nested of extractQuotedModules(text)) {
      if (!seen.has(nested)) queue.push(nested);
    }
  }

  return scriptTexts;
}

function discoverDataModulesFromSources(sources: string[]): string[] {
  const modules = new Set<string>();
  const pattern = /data-module\.[A-Za-z0-9_.-]+\.mjs/g;

  for (const source of sources) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      modules.add(match[0]);
    }
  }

  return [...modules];
}

function parseCollectionUtilsMap(sources: string[]): Map<string, string> {
  const combined = sources.join("\n");
  const map = new Map<string, string>();

  const entryPattern =
    /([A-Za-z0-9_]+)\s*:\s*async\s*\(\)\s*=>\s*(?:\(?\s*)?(?:await\s+)?import\s*\(\s*["'`](?:\.\/)?([^"'`]+\.mjs)["'`]\s*\)[^,}]*?(?:\)?\s*)?(?:\?\.)?\s*utils/g;

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(combined)) !== null) {
    map.set(match[1], match[2]);
  }

  return map;
}

function parseDataModuleChunkPath(dataModuleSource: string): string | null {
  const match = dataModuleSource.match(/from\s*["'`](\.\/chunk-[^"'`]+\.mjs)["'`]/);
  return match?.[1].replace(/^\.\//, "") ?? null;
}

function parseModuleImportPaths(moduleSource: string): string[] {
  const paths = new Set<string>();
  const pattern = /from\s*["'`](\.\/[^"'`]+\.mjs)["'`]/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(moduleSource)) !== null) {
    paths.add(match[1].replace(/^\.\//, ""));
  }

  return [...paths];
}

function looksLikeCmsChunk(source: string): boolean {
  return (
    source.includes("framerCollectionId") ||
    /title\s*:\s*["'`][^"'`]+["'`]\s*,\s*type\s*:/.test(source)
  );
}

function mapFramerType(rawType: string): CmsFieldType {
  return (
    FRAMER_RUNTIME_TYPE_MAP[rawType] ||
    FRAMER_LITERAL_TYPE_MAP[rawType] ||
    "PLAIN_TEXT"
  );
}

function parseFieldIdVariables(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const declMatch = source.match(
    /var\s+((?:[a-zA-Z_$][\w$]*\s*=\s*["'`][A-Za-z0-9_]+["'`]\s*,?\s*)+)/
  );
  if (!declMatch) return map;

  const assignments = declMatch[1].match(/([a-zA-Z_$][\w$]*)\s*=\s*["'`]([A-Za-z0-9_]+)["'`]/g);
  if (!assignments) return map;

  for (const assignment of assignments) {
    const parts = assignment.match(/([a-zA-Z_$][\w$]*)\s*=\s*["'`]([A-Za-z0-9_]+)["'`]/);
    if (parts) map.set(parts[1], parts[2]);
  }

  return map;
}

function extractSchemaBlock(source: string): string | null {
  const patterns = [
    /(?:^|[^\w])(?:f|h|P)\(\s*[a-zA-Z_$][\w$]*\s*,\s*\{/g,
    /fields\s*:\s*\[/g,
    /[a-zA-Z_$][\w$]*\(\s*[a-zA-Z_$][\w$]*\s*,\s*\{/g,
  ];

  let bestBlock: string | null = null;
  let bestFieldCount = 0;

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const start = match.index + match[0].length - 1;
      const block = extractBalancedBlock(source, start);
      if (!block) continue;

      const fieldCount = parseSchemaFields(block).length;
      if (fieldCount > bestFieldCount) {
        bestFieldCount = fieldCount;
        bestBlock = block;
      }
    }
  }

  return bestBlock;
}

function extractBalancedBlock(
  source: string,
  openIndex: number,
  openChar: "{" | "[" = "{",
  closeChar: "}" | "]" = "}"
): string | null {
  if (source[openIndex] !== openChar) return null;

  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];
    if (char === openChar) depth++;
    else if (char === closeChar) {
      depth--;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }

  return null;
}

function parseSchemaFields(schemaBlock: string): ParsedFramerField[] {
  const fields: ParsedFramerField[] = [];
  const fieldPattern = /([A-Za-z0-9_]+)\s*:\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = fieldPattern.exec(schemaBlock)) !== null) {
    const fieldId = match[1];
    const bodyStart = match.index + match[0].length - 1;
    const body = extractBalancedBlock(schemaBlock, bodyStart);
    if (!body) continue;

    const titleMatch = body.match(/title\s*:\s*["'`]([^"'`]+)["'`]/);
    const typeMatch =
      body.match(/type\s*:\s*[a-zA-Z_$][\w$]*\.(\w+)/) ||
      body.match(/type\s*:\s*["'`]([^"'`]+)["'`]/);

    if (!titleMatch || !typeMatch) continue;

    const field: ParsedFramerField = {
      id: fieldId,
      name: titleMatch[1],
      type: mapFramerType(typeMatch[1]),
    };

    if (/required\s*:\s*!0|required\s*:\s*true/.test(body)) {
      field.required = true;
    }

    const enumCases = [...body.matchAll(/name\s*:\s*["'`]([^"'`]+)["'`]/g)]
      .map((m) => m[1])
      .filter((name) => name !== field.name);
    if (field.type === "OPTION" && enumCases.length > 0) {
      field.options = enumCases;
    }

    const refMatch = body.match(/collectionId\s*:\s*["'`]([^"'`]+)["'`]/);
    if (refMatch) field.refCollectionId = refMatch[1];

    fields.push(field);
  }

  return fields;
}

function extractDisplayName(source: string): string | null {
  const patterns = [
    /\.displayName\s*=\s*["'`]([^"'`]+)["'`]/,
    /displayName\s*:\s*["'`]([^"'`]+)["'`]/,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractCollectionMetadata(source: string): {
  framerCollectionId: string;
  slugFieldId: string;
} {
  const collectionId =
    source.match(/framerCollectionId\s*:\s*["'`]([^"'`]+)["'`]/)?.[1] || "";
  const slugFieldId =
    source.match(/framerSlug\s*:\s*["'`]([^"'`]+)["'`]/)?.[1] || "";

  return { framerCollectionId: collectionId, slugFieldId };
}

function resolveFieldKey(
  rawKey: string,
  varToFieldId: Map<string, string>,
  knownFieldIds: Set<string>
): string | null {
  if (knownFieldIds.has(rawKey)) return rawKey;
  return varToFieldId.get(rawKey) ?? null;
}

function extractEntryObjects(source: string): string[] {
  const entries: string[] = [];
  const arrayMatch = source.match(/=\s*\[\s*\{index\s*:\s*\d+/);
  if (!arrayMatch?.index) return entries;

  const arrayStart = source.indexOf("[", arrayMatch.index);
  if (arrayStart === -1) return entries;

  const arrayBody = extractBalancedBlock(source, arrayStart, "[", "]");
  if (!arrayBody) return entries;

  const entryPattern = /\{\s*index\s*:\s*\d+/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(arrayBody)) !== null) {
    const blockStart = match.index;
    const block = extractBalancedBlock(arrayBody, blockStart, "{", "}");
    if (block) entries.push(block);
  }

  return entries;
}

function parseStringValue(entryBlock: string, key: string): string | undefined {
  const pattern = new RegExp(
    "\\[" + key + "\\]\\s*:\\s*[\"']((?:\\\\.|[^\"'])*)[\"']"
  );
  const altPattern = new RegExp(
    key + "\\s*:\\s*[\"']((?:\\\\.|[^\"'])*)[\"']"
  );
  return entryBlock.match(pattern)?.[1] || entryBlock.match(altPattern)?.[1];
}

function parseImageValue(entryBlock: string, key: string): { url: string; alt: string } | undefined {
  const blockPattern = new RegExp(
    "\\[" +
      key +
      "\\]\\s*:\\s*(?:[a-zA-Z_$][\\w$]*\\()?\\{[^}]*src\\s*:\\s*[\"']([^\"']+)[\"']",
    "s"
  );
  const match = entryBlock.match(blockPattern);
  if (!match) return undefined;

  const altMatch = entryBlock
    .slice(match.index || 0, (match.index || 0) + match[0].length + 80)
    .match(/alt\s*:\s*["']([^"']*)["']/);

  return { url: match[1], alt: altMatch?.[1] || "" };
}

function parseBooleanValue(entryBlock: string, key: string): boolean | undefined {
  const pattern = new RegExp(`\\[${key}\\]\\s*:\\s*(!0|!1|true|false)`);
  const match = entryBlock.match(pattern);
  if (!match) return undefined;
  return match[1] === "!0" || match[1] === "true";
}

function parseNumberValue(entryBlock: string, key: string): number | undefined {
  const pattern = new RegExp(`\\[${key}\\]\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`);
  const match = entryBlock.match(pattern);
  if (!match) return undefined;
  return Number(match[1]);
}

function parseFieldValue(
  entryBlock: string,
  field: ParsedFramerField,
  key: string
): unknown {
  switch (field.type) {
    case "TOGGLE":
      return parseBooleanValue(entryBlock, key) ?? false;
    case "NUMBER":
      return parseNumberValue(entryBlock, key) ?? 0;
    case "IMAGE": {
      const image = parseImageValue(entryBlock, key);
      return image;
    }
    case "LINK": {
      const url = parseStringValue(entryBlock, `${key}_url`) || parseStringValue(entryBlock, key);
      const text = parseStringValue(entryBlock, `${key}_text`) || "";
      return { url: url || "", text };
    }
    case "GALLERY":
    case "MULTI_REFERENCE":
    case "VECTOR_SET":
      return [];
    case "COLOR":
      return parseStringValue(entryBlock, key) || "#000000";
    case "FILE": {
      const url = parseStringValue(entryBlock, key) || "";
      return { url, name: "" };
    }
    default:
      return parseStringValue(entryBlock, key) ?? "";
  }
}

function parseEntries(
  source: string,
  fields: ParsedFramerField[],
  slugFieldId: string
): DetectedCmsEntry[] {
  const varToFieldId = parseFieldIdVariables(source);
  const knownFieldIds = new Set(fields.map((f) => f.id));
  const varToField = new Map<string, string>();

  for (const [varName, fieldId] of varToFieldId) {
    if (knownFieldIds.has(fieldId)) varToField.set(varName, fieldId);
  }

  const slugVar = [...varToField.entries()].find(([, id]) => id === slugFieldId)?.[0];
  const entryBlocks = extractEntryObjects(source);
  const entries: DetectedCmsEntry[] = [];

  for (const block of entryBlocks) {
    const values: Record<string, unknown> = {};
    let slug = "";

    for (const field of fields) {
      const keysToTry = new Set<string>([field.id]);
      for (const [varName, fieldId] of varToField) {
        if (fieldId === field.id) keysToTry.add(varName);
      }

      for (const key of keysToTry) {
        const parsed = parseFieldValue(block, field, key);
        if (parsed === undefined || parsed === "") continue;
        values[field.id] = parsed;
        break;
      }
    }

    if (slugFieldId) {
      const slugKeys = new Set([slugFieldId]);
      if (slugVar) slugKeys.add(slugVar);
      for (const key of slugKeys) {
        const candidate = parseStringValue(block, key);
        if (candidate) {
          slug = candidate;
          break;
        }
      }
    }

    if (!slug) {
      const idMatch = block.match(/id\s*:\s*["'`]([^"'`]+)["'`]/);
      slug = idMatch?.[1] ? slugify(idMatch[1]) : `entry-${entries.length + 1}`;
    }

    entries.push({ slug, values: mapEntryValuesToSlugs(values, fields), published: true });
  }

  return entries;
}

function mapEntryValuesToSlugs(
  values: Record<string, unknown>,
  fields: ParsedFramerField[]
): Record<string, unknown> {
  const fieldIdToSlug = new Map(fields.map((f) => [f.id, uniqueFieldSlug(f, fields)]));
  const mapped: Record<string, unknown> = {};

  for (const [fieldId, value] of Object.entries(values)) {
    const slug = fieldIdToSlug.get(fieldId);
    if (slug) mapped[slug] = value;
  }

  return mapped;
}

function uniqueFieldSlug(field: ParsedFramerField, allFields: ParsedFramerField[]): string {
  const base = slugify(field.name);
  const sameName = allFields.filter((f) => slugify(f.name) === base);
  if (sameName.length <= 1) return base;
  return `${base}-${field.id.slice(0, 6).toLowerCase()}`;
}

function toDetectedFields(
  fields: ParsedFramerField[],
  collectionsById: Map<string, DetectedCmsCollection>
): DetectedCmsField[] {
  return fields.map((field) => {
    const detected: DetectedCmsField = {
      name: field.name,
      slug: uniqueFieldSlug(field, fields),
      type: field.type,
      framerFieldId: field.id,
      required: field.required,
      options: field.options,
      refCollectionId: field.refCollectionId,
    };

    if (field.refCollectionId) {
      const ref = collectionsById.get(field.refCollectionId);
      if (ref) detected.refCollectionSlug = ref.slug;
    }

    return detected;
  });
}

function validateParsedCollection(parsed: ParsedFramerCollection): string[] {
  const errors: string[] = [];

  if (!parsed.name) errors.push("missing collection name");
  if (!parsed.framerCollectionId) errors.push("missing framerCollectionId");
  if (parsed.fields.length === 0) errors.push("no fields parsed");
  if (parsed.fields.length !== parsed.sourceFieldCount) {
    errors.push(
      `field count mismatch: parsed ${parsed.fields.length}, source ${parsed.sourceFieldCount}`
    );
  }

  const ids = new Set<string>();
  for (const field of parsed.fields) {
    if (ids.has(field.id)) errors.push(`duplicate field id: ${field.id}`);
    ids.add(field.id);
    if (!field.name) errors.push(`field ${field.id} missing name`);
  }

  if (parsed.slugFieldId) {
    const slugField = parsed.fields.find((f) => f.id === parsed.slugFieldId);
    if (!slugField) errors.push(`slug field ${parsed.slugFieldId} not found in schema`);
  }

  return errors;
}

function parseCmsChunk(source: string): ParsedFramerCollection | null {
  const schemaBlock = extractSchemaBlock(source);
  if (!schemaBlock) return null;

  const fields = parseSchemaFields(schemaBlock);
  if (fields.length === 0) return null;

  const { framerCollectionId, slugFieldId } = extractCollectionMetadata(source);
  const name = extractDisplayName(source) || "CMS Collection";
  const entries = parseEntries(source, fields, slugFieldId);

  return {
    name,
    framerCollectionId,
    slugFieldId,
    fields,
    entries,
    sourceFieldCount: fields.length,
  };
}

async function fetchCollectionFromModule(
  bases: string[],
  modulePath: string
): Promise<ParsedFramerCollection | null> {
  const moduleSource = await fetchTextFromBases(bases, modulePath);
  if (!moduleSource) return null;

  const candidatePaths = new Set<string>();
  const legacyChunkPath = parseDataModuleChunkPath(moduleSource);
  if (legacyChunkPath) candidatePaths.add(legacyChunkPath);

  for (const importPath of parseModuleImportPaths(moduleSource)) {
    candidatePaths.add(importPath);
  }

  if (looksLikeCmsChunk(moduleSource)) {
    candidatePaths.add(modulePath.replace(/^\.\//, ""));
  }

  const seen = new Set<string>();
  for (const candidatePath of candidatePaths) {
    if (seen.has(candidatePath)) continue;
    seen.add(candidatePath);

    const chunkSource =
      candidatePath === modulePath.replace(/^\.\//, "") &&
      looksLikeCmsChunk(moduleSource)
        ? moduleSource
        : await fetchTextFromBases(bases, candidatePath);
    if (!chunkSource) continue;

    const parsed = parseCmsChunk(chunkSource);
    if (parsed) return parsed;
  }

  return null;
}

function hasCmsDataModules(sources: string[]): boolean {
  const combined = sources.join("\n");
  return /data-module\.[A-Za-z0-9_.-]+\.mjs/.test(combined);
}

function hasEmptyCollectionUtilsMap(sources: string[]): boolean {
  const combined = sources.join("\n");
  return /\bQ\s*=\s*\{\s*\}/.test(combined) || /collectionUtils\s*:\s*\{\s*\}/.test(combined);
}

export async function detectFramerCmsWithDiagnostics(
  site: FramerSite
): Promise<CmsDetectionResult> {
  const bases = siteModuleBases(site);
  const scriptSources = await discoverScriptSources(site);
  const collectionUtils = parseCollectionUtilsMap(scriptSources);
  const orphanModules = discoverDataModulesFromSources(scriptSources);

  if (collectionUtils.size === 0) {
    for (const modulePath of orphanModules) {
      collectionUtils.set(modulePath, modulePath);
    }
  }

  if (collectionUtils.size === 0) {
    const hasDataModules = hasCmsDataModules(scriptSources) || orphanModules.length > 0;
    const emptyMap = hasEmptyCollectionUtilsMap(scriptSources);

    let message: string;
    if (emptyMap) {
      message =
        "This Framer site has no CMS collections in its published bundle (collectionUtils is empty). Static landing-page and waitlist templates often have no CMS — create collections manually in the dashboard.";
    } else if (hasDataModules) {
      message =
        "CMS data modules were referenced but could not be loaded. Try the original *.framer.app URL instead of a custom domain, or create collections manually.";
    } else {
      message =
        "No Framer CMS collections found. Only sites that use Framer CMS in the editor embed collection data in the published JavaScript. Create collections manually in the dashboard.";
    }

    return {
      collections: [],
      status: "no_cms",
      message,
      collectionUtilsFound: 0,
      dataModulesFound: orphanModules.length,
    };
  }

  const parsedByCollectionId = new Map<string, ParsedFramerCollection>();
  let parseFailures = 0;

  for (const [collectionId, dataModulePath] of collectionUtils) {
    const parsed = await fetchCollectionFromModule(bases, dataModulePath);
    if (!parsed) {
      parseFailures++;
      continue;
    }

    parsed.framerCollectionId = parsed.framerCollectionId || collectionId;
    const validationErrors = validateParsedCollection(parsed);
    if (validationErrors.length > 0) {
      parseFailures++;
      continue;
    }

    parsedByCollectionId.set(parsed.framerCollectionId, parsed);
  }

  if (parsedByCollectionId.size === 0) {
    return {
      collections: [],
      status: "parse_failed",
      message: `Found ${collectionUtils.size} CMS reference(s) but could not parse the schema (${parseFailures} failed). The Framer bundle format may have changed.`,
      collectionUtilsFound: collectionUtils.size,
      dataModulesFound: orphanModules.length,
    };
  }

  const preliminaryCollections: DetectedCmsCollection[] = [...parsedByCollectionId.values()].map(
    (parsed) => ({
      name: parsed.name,
      slug: slugify(parsed.name),
      framerCollectionId: parsed.framerCollectionId,
      fields: [],
      entries: parsed.entries,
    })
  );

  const collectionsById = new Map(
    preliminaryCollections.map((collection) => [collection.framerCollectionId, collection])
  );

  const collections: DetectedCmsCollection[] = [];

  for (const parsed of parsedByCollectionId.values()) {
    const allFields = toDetectedFields(parsed.fields, collectionsById);

    const validationErrors = validateParsedCollection(parsed);
    if (validationErrors.length > 0) continue;
    if (allFields.length !== parsed.sourceFieldCount) continue;

    const fields = filterSystemFields(allFields);
    const entries = stripSystemFieldValues(parsed.entries, allFields);
    const collection: DetectedCmsCollection = {
      name: parsed.name,
      slug: slugify(parsed.name),
      framerCollectionId: parsed.framerCollectionId,
      fields,
      entries,
    };

    collections.push(collection);
  }

  return {
    collections,
    status: "found",
    message: `Detected ${collections.length} CMS collection(s) with ${collections.reduce((n, c) => n + c.fields.length, 0)} fields total.`,
    collectionUtilsFound: collectionUtils.size,
    dataModulesFound: orphanModules.length,
  };
}

export async function detectFramerCms(site: FramerSite): Promise<DetectedCmsCollection[]> {
  const result = await detectFramerCmsWithDiagnostics(site);
  return result.collections;
}

export async function detectFramerCmsFromUrl(framerUrl: string): Promise<DetectedCmsCollection[]> {
  const html = await fetchFramerPage(framerUrl);
  const projectIdMatch = html.match(/framerusercontent\.com\/sites\/([a-zA-Z0-9]+)\//);

  const scriptRefs = extractScriptRefsFromHtml(html);
  const scriptUrl =
    scriptRefs.find((ref) => ref.startsWith("http")) ||
    scriptRefs[0] ||
    html.match(/src="(https:\/\/framerusercontent\.com\/sites\/[^"]+script_main[^"]+\.mjs)"/)?.[1] ||
    html.match(/src="(https:\/\/framerusercontent\.com\/sites\/[^"]+script\.mjs)"/)?.[1];

  const modulePreloads = [
    ...html.matchAll(/href="(https:\/\/framerusercontent\.com\/sites\/[^"]+\.mjs)"/g),
  ].map((m) => m[1]);

  const minimalSite: FramerSite = {
    url: framerUrl,
    projectId: projectIdMatch?.[1] || "unknown",
    meta: {
      title: html.match(/<title>([^<]*)</)?.[1] || "Site",
      description: html.match(/name="description" content="([^"]*)"/)?.[1] || "",
      ogImage: html.match(/property="og:image" content="([^"]*)"/)?.[1],
    },
    pages: [{ path: "/", title: "Home", html }],
    styles: [],
    scriptUrl,
    modulePreloads,
    fonts: [],
    bootstrapHtml: html,
  };

  return detectFramerCms(minimalSite);
}