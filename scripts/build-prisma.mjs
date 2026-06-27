import { execSync } from "node:child_process";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
const platform = process.env.NETLIFY ? "Netlify" : process.env.VERCEL ? "Vercel" : "your host";

if (!hasDatabase) {
  console.warn(
    `\n⚠️  DATABASE_URL is not set — skipping prisma migrate deploy.\n` +
      `   The build will continue, but auth/CMS will not work until you add:\n` +
      `   • DATABASE_URL (PostgreSQL — Neon recommended)\n` +
      `   • AUTH_SECRET\n` +
      `   • AUTH_URL\n` +
      `   in ${platform} → Environment variables.\n` +
      `   See .env.example for the expected format.\n`
  );
  process.exit(0);
}

// We use `db push` (no migrations folder), which syncs the schema and creates
// any missing tables — auto-provisioning the database on first deploy.
console.log("Syncing database schema (prisma db push)…");
execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });