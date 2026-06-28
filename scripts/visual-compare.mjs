/**
 * Visual fidelity check — screenshots the ORIGINAL Framer site and the CONVERTED
 * site at desktop/tablet/mobile, then computes a pixel match % per breakpoint.
 *
 *   node scripts/visual-compare.mjs <originalUrl> <convertedUrl>
 *
 * Output: ./visual-report/<bp>-{original,converted,diff}.png + a summary table.
 */
import puppeteer from "puppeteer-core";
import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { mkdirSync } from "fs";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BREAKPOINTS = [
  { name: "desktop", width: 1440 },
  { name: "tablet", width: 834 },
  { name: "mobile", width: 390 },
];

const [, , originalUrl, convertedUrl] = process.argv;
if (!originalUrl || !convertedUrl) {
  console.error("Usage: node scripts/visual-compare.mjs <originalUrl> <convertedUrl>");
  process.exit(1);
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((res) => {
      let total = 0;
      const step = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          res();
        }
      }, 80);
    });
  });
  await new Promise((r) => setTimeout(r, 1000)); // let lazy images settle
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
}

async function shoot(browser, url, width) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await autoScroll(page);
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  await page.close();
  return buf;
}

async function compare(aBuf, bBuf, outPath) {
  const am = await sharp(aBuf).metadata();
  const bm = await sharp(bBuf).metadata();
  const W = Math.min(am.width, bm.width);
  const H = Math.min(am.height, bm.height);
  const crop = (buf) =>
    sharp(buf).extract({ left: 0, top: 0, width: W, height: H }).ensureAlpha().raw().toBuffer();
  const aRaw = await crop(aBuf);
  const bRaw = await crop(bBuf);
  const diff = Buffer.alloc(W * H * 4);
  const n = pixelmatch(aRaw, bRaw, diff, W, H, { threshold: 0.15 });
  await sharp(diff, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
  return { match: 100 * (1 - n / (W * H)), diffPixels: n, W, H };
}

async function main() {
  mkdirSync("visual-report", { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--hide-scrollbars"],
  });

  console.log(`\nOriginal:  ${originalUrl}\nConverted: ${convertedUrl}\n`);
  const results = [];
  for (const bp of BREAKPOINTS) {
    process.stdout.write(`• ${bp.name} (${bp.width}px) … `);
    const [a, b] = await Promise.all([
      shoot(browser, originalUrl, bp.width),
      shoot(browser, convertedUrl, bp.width),
    ]);
    await sharp(a).png().toFile(`visual-report/${bp.name}-original.png`);
    await sharp(b).png().toFile(`visual-report/${bp.name}-converted.png`);
    const r = await compare(a, b, `visual-report/${bp.name}-diff.png`);
    results.push({ bp: bp.name, ...r });
    console.log(`${r.match.toFixed(2)}% match (${r.W}×${r.H})`);
  }

  await browser.close();
  console.log("\n=== FIDELITY REPORT ===");
  for (const r of results) {
    const flag = r.match >= 98 ? "✓" : r.match >= 92 ? "~" : "✗";
    console.log(`${flag} ${r.bp.padEnd(8)} ${r.match.toFixed(2)}% match`);
  }
  console.log("\nImages saved to ./visual-report/");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
