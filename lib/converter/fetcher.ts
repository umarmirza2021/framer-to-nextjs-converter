import { mapWithConcurrency } from "./shared/concurrency";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PAGE_FETCH_TIMEOUT_MS = 20_000;
const ASSET_FETCH_TIMEOUT_MS = 12_000;
const ASSET_DOWNLOAD_CONCURRENCY = 10;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeFramerUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  const parsed = new URL(url);
  parsed.hash = "";
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname += "/";
  }
  return parsed.toString();
}

export function isFramerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith(".framer.website") ||
      parsed.hostname.endsWith(".framer.app") ||
      parsed.hostname === "framer.website" ||
      parsed.hostname === "framer.app" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

export async function fetchFramerPage(url: string): Promise<string> {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    },
    PAGE_FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  if (!html.includes("framer") && !html.includes("Framer")) {
    throw new Error(
      "This URL does not appear to be a Framer site. Make sure you're using a published Framer URL (e.g. yoursite.framer.website)."
    );
  }

  return html;
}

export async function fetchSearchIndex(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return [];

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) return [];

    const text = await response.text();
    const data = JSON.parse(text) as unknown;

    if (Array.isArray(data)) {
      return data
        .filter((item: { path?: string }) => item.path)
        .map((item: { path: string }) => item.path);
    }

    if (data && typeof data === "object") {
      return Object.keys(data as Record<string, unknown>).filter((p) =>
        p.startsWith("/")
      );
    }

    return [];
  } catch {
    return [];
  }
}

export async function downloadAsset(url: string): Promise<Buffer | null> {
  try {
    const response = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": USER_AGENT } },
      ASSET_FETCH_TIMEOUT_MS
    );
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function downloadAssetsParallel(
  urls: string[]
): Promise<Map<string, Buffer>> {
  const results = await mapWithConcurrency(urls, ASSET_DOWNLOAD_CONCURRENCY, async (url) => {
    const buffer = await downloadAsset(url);
    return { url, buffer };
  });

  const map = new Map<string, Buffer>();
  for (const { url, buffer } of results) {
    if (buffer) map.set(url, buffer);
  }
  return map;
}