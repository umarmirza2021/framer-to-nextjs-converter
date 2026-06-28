import { createHash } from "crypto";
import { fetchFramerPage } from "@/lib/converter/fetcher";

/**
 * Normalize Framer HTML so the fingerprint is stable across identical
 * republishes but changes when real content changes. We drop the volatile
 * bits Framer regenerates on every request (script bodies, nonces, comments)
 * and collapse whitespace.
 */
export function normalizeForHash(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "") // per-request script payloads
    .replace(/<!--[\s\S]*?-->/g, "") // build comments
    .replace(/\s+nonce="[^"]*"/gi, "") // CSP nonces
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch the live Framer page and return a content fingerprint (sha256). */
export async function fetchContentHash(framerUrl: string): Promise<string> {
  const html = await fetchFramerPage(framerUrl);
  return createHash("sha256").update(normalizeForHash(html)).digest("hex");
}
