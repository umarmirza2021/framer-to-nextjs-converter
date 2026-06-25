export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
}

export function getAuthUrl(): string | undefined {
  const explicit = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const host =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.VERCEL_URL ||
    process.env.NETLIFY_URL;

  if (!host) return undefined;
  return host.startsWith("http") ? host.replace(/\/$/, "") : `https://${host}`;
}

export function getAuthConfigError(): string | null {
  if (!getAuthSecret()) {
    return "AUTH_SECRET is not set. Add it in Netlify/Vercel environment variables (generate with: openssl rand -base64 32).";
  }
  return null;
}