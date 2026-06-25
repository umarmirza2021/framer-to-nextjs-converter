import { detectFramerCmsWithDiagnostics } from "../lib/cms/framer-detector.ts";
import { parseFramerSite } from "../lib/converter/parser.ts";

async function test(url) {
  console.log("\n===", url, "===");
  const site = await parseFramerSite(url);
  const result = await detectFramerCmsWithDiagnostics(site);
  console.log("status:", result.status);
  console.log("message:", result.message);
  console.log("collections:", result.collections.length);
  for (const c of result.collections) {
    console.log(
      " -",
      c.name,
      ":",
      c.fields.length,
      "fields,",
      c.entries.length,
      "entries"
    );
    console.log("   fields:", c.fields.map((f) => f.name).join(", "));
  }
  console.log(
    "utils:",
    result.collectionUtilsFound,
    "modules:",
    result.dataModulesFound
  );
}

async function main() {
  await test("https://short-osprey-714201.framer.app/");
  await test("https://captable.expert/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});