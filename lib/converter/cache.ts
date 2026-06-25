import { randomUUID } from "crypto";
import type { ConversionResult } from "./types";

interface CachedConversion {
  files: Record<string, string | Buffer>;
  previewHtml: string;
  stats: ConversionResult["stats"];
  siteName: string;
  title: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CachedConversion>();

function cleanup(): void {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.createdAt > TTL_MS) {
      cache.delete(id);
    }
  }
}

export function storeConversion(
  data: Omit<CachedConversion, "createdAt">
): string {
  cleanup();
  const id = randomUUID();
  cache.set(id, { ...data, createdAt: Date.now() });
  return id;
}

export function getCached(id: string): CachedConversion | null {
  cleanup();
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(id);
    return null;
  }
  return entry;
}