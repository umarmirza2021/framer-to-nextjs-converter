import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { ConversionResult } from "./types";

interface CachedConversion {
  files: Record<string, string | Buffer>;
  previewHtml: string;
  stats: ConversionResult["stats"];
  siteName: string;
  title: string;
  cmsDetection?: string;
  createdAt: number;
}

interface CachedConversionMeta {
  stats: ConversionResult["stats"];
  siteName: string;
  title: string;
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const CACHE_DIR = path.join(os.tmpdir(), "framer-to-nextjs-cache");

function entryDir(id: string): string {
  return path.join(CACHE_DIR, id);
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function cleanup(): Promise<void> {
  await ensureCacheDir();
  const now = Date.now();
  let entries: string[];
  try {
    entries = await fs.readdir(CACHE_DIR);
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (id) => {
      try {
        const metaRaw = await fs.readFile(path.join(CACHE_DIR, id, "meta.json"), "utf8");
        const meta = JSON.parse(metaRaw) as CachedConversionMeta;
        if (now - meta.createdAt > TTL_MS) {
          await fs.rm(path.join(CACHE_DIR, id), { recursive: true, force: true });
        }
      } catch {
        await fs.rm(path.join(CACHE_DIR, id), { recursive: true, force: true }).catch(() => {});
      }
    })
  );
}

function serializeFiles(files: Record<string, string | Buffer>): string {
  const serialized: Record<string, string | { type: "buffer"; data: string }> = {};
  for (const [filePath, content] of Object.entries(files)) {
    if (Buffer.isBuffer(content)) {
      serialized[filePath] = { type: "buffer", data: content.toString("base64") };
    } else {
      serialized[filePath] = content;
    }
  }
  return JSON.stringify(serialized);
}

function deserializeFiles(
  raw: Record<string, string | { type: "buffer"; data: string }>
): Record<string, string | Buffer> {
  const files: Record<string, string | Buffer> = {};
  for (const [filePath, content] of Object.entries(raw)) {
    if (typeof content === "string") {
      files[filePath] = content;
    } else {
      files[filePath] = Buffer.from(content.data, "base64");
    }
  }
  return files;
}

export async function storeConversion(
  data: Omit<CachedConversion, "createdAt">
): Promise<string> {
  await cleanup();
  const id = randomUUID();
  const dir = entryDir(id);
  await fs.mkdir(dir, { recursive: true });

  const meta: CachedConversionMeta = {
    stats: data.stats,
    siteName: data.siteName,
    title: data.title,
    createdAt: Date.now(),
  };

  const writes: Promise<void>[] = [
    fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta)),
    fs.writeFile(path.join(dir, "preview.html"), data.previewHtml, "utf8"),
    fs.writeFile(path.join(dir, "files.json"), serializeFiles(data.files), "utf8"),
  ];

  if (data.cmsDetection) {
    writes.push(fs.writeFile(path.join(dir, "cms.json"), data.cmsDetection, "utf8"));
  }

  await Promise.all(writes);

  return id;
}

export async function getCached(id: string): Promise<CachedConversion | null> {
  await cleanup();
  const dir = entryDir(id);

  try {
    const [metaRaw, previewHtml, filesRaw, cmsRaw] = await Promise.all([
      fs.readFile(path.join(dir, "meta.json"), "utf8"),
      fs.readFile(path.join(dir, "preview.html"), "utf8"),
      fs.readFile(path.join(dir, "files.json"), "utf8"),
      fs.readFile(path.join(dir, "cms.json"), "utf8").catch(() => null),
    ]);

    const meta = JSON.parse(metaRaw) as CachedConversionMeta;
    if (Date.now() - meta.createdAt > TTL_MS) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      return null;
    }

    const files = deserializeFiles(
      JSON.parse(filesRaw) as Record<string, string | { type: "buffer"; data: string }>
    );

    return {
      files,
      previewHtml,
      stats: meta.stats,
      siteName: meta.siteName,
      title: meta.title,
      cmsDetection: cmsRaw || undefined,
      createdAt: meta.createdAt,
    };
  } catch {
    return null;
  }
}