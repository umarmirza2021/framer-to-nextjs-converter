import { deserializeFiles } from "@/lib/projects";

export function projectFilesToDeployList(filesJson: string): { file: string; data: string }[] {
  const files = deserializeFiles(filesJson);
  return Object.entries(files).map(([file, content]) => ({
    file,
    data: Buffer.isBuffer(content)
      ? content.toString("base64")
      : Buffer.from(content, "utf8").toString("base64"),
  }));
}