const TIMEOUT_PATTERNS = [
  /inactivity timeout/i,
  /gateway timeout/i,
  /timed out/i,
  /timeout/i,
  /504/,
  /503/,
];

export function formatConversionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Conversion failed.";

  if (TIMEOUT_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Conversion timed out. Large sites can take a while — please try again. If it keeps failing, the site may have too many pages or assets.";
  }

  if (message.includes("Failed to fetch") && message.includes("404")) {
    return "Could not reach that URL. Check that your Framer site is published and the URL is correct.";
  }

  if (message.includes("does not appear to be a Framer site")) {
    return message;
  }

  if (message.includes("Could not detect Framer project ID")) {
    return "This doesn't look like a published Framer site. Use your live Framer URL (e.g. yoursite.framer.website).";
  }

  if (message.includes("<!DOCTYPE") || message.includes("<HTML>")) {
    return "The server returned an unexpected response. Please try again in a moment.";
  }

  return message;
}

export function formatHttpError(status: number, body: string): string {
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 200);

  if (status === 504 || /inactivity timeout/i.test(body)) {
    return "Conversion timed out on the server. Please try again — we've optimized for faster conversions.";
  }

  if (status === 502 || status === 503) {
    return "The server is temporarily unavailable. Please wait a moment and try again.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a minute and try again.";
  }

  return `Server error (${status}): ${snippet || "unknown error"}`;
}