import archiver from "archiver";
import { PassThrough } from "stream";

export async function createZip(
  files: Record<string, string | Buffer>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", reject);
    archive.pipe(passthrough);

    for (const [path, content] of Object.entries(files)) {
      if (Buffer.isBuffer(content)) {
        archive.append(content, { name: path });
      } else {
        archive.append(content, { name: path });
      }
    }

    archive.finalize();
  });
}