import { fetchFramerPage } from "./fetcher";
import { fetchWebflowPage, isWebflowHtml } from "./webflow/fetcher";
import type { Platform } from "./types";

function isFramerHtml(html: string): boolean {
  return (
    html.includes("framerusercontent.com") ||
    html.includes("data-framer-hydrate-v2") ||
    html.includes("data-framer-bundle")
  );
}

export async function detectPlatform(url: string): Promise<Platform | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  if (isFramerHtml(html)) return "framer";
  if (isWebflowHtml(html)) return "webflow";
  return null;
}

export async function fetchPageForPlatform(
  url: string,
  platform: Platform
): Promise<string> {
  if (platform === "framer") return fetchFramerPage(url);
  return fetchWebflowPage(url);
}