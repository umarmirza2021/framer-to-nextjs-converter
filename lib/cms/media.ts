import fs from "fs/promises";
import path from "path";
import { getSetting } from "./settings";

const MEDIA_DIR = path.join(process.cwd(), "public", "cms-media");

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-80);
}

/** Save an uploaded file with the configured provider. Local works out of the box. */
export async function uploadMedia(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string }> {
  const provider = (await getSetting("MEDIA_PROVIDER")) || "local";

  if (provider === "local") {
    await fs.mkdir(MEDIA_DIR, { recursive: true });
    const unique = `${Date.now()}-${sanitize(filename)}`;
    await fs.writeFile(path.join(MEDIA_DIR, unique), buffer);
    return { url: `/cms-media/${unique}` };
  }

  // Cloud providers (cloudinary | s3) are configured via env; not enabled by default.
  throw new Error(
    `Media provider "${provider}" is not configured on this server. Use MEDIA_PROVIDER=local or add cloud credentials.`
  );
}

/** List previously uploaded local media (newest first). */
export async function listMedia(): Promise<string[]> {
  try {
    const files = await fs.readdir(MEDIA_DIR);
    return files
      .filter((f) => !f.startsWith("."))
      .sort()
      .reverse()
      .map((f) => `/cms-media/${f}`);
  } catch {
    return [];
  }
}
