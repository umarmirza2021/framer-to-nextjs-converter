const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item: { path?: string }) => item.path)
      .map((item: { path: string }) => item.path);
  } catch {
    return [];
  }
}

export async function downloadAsset(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}