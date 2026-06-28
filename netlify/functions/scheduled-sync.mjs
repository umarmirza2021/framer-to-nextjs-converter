// Netlify Scheduled Function — runs on a cron and pings the app's sync endpoint.
// Netlify auto-detects functions in netlify/functions/. Requires CRON_SECRET set
// in the site's environment variables.
export const config = { schedule: "0 */3 * * *" }; // every 3 hours

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    return new Response("Missing URL or CRON_SECRET", { status: 500 });
  }

  const res = await fetch(`${base}/api/cron/sync?secret=${secret}`);
  const body = await res.text();
  return new Response(`sync triggered: ${res.status} ${body}`, { status: 200 });
};
