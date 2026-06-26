import { z } from "zod";
import { handler, ok } from "@/lib/cms/api";
import { getMaskedSettings, setMany } from "@/lib/cms/settings";

// GET /api/cms/settings — current settings (secrets masked)
export const GET = handler(async () => {
  return ok(await getMaskedSettings());
});

const updateSchema = z.record(z.string(), z.string());

// PUT /api/cms/settings — update settings (only non-empty values are written;
// masked placeholders are ignored so secrets aren't overwritten with bullets)
export const PUT = handler(async ({ req }) => {
  const body = await req.json();
  const parsed = updateSchema.parse(body);
  const toWrite: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value && !value.startsWith("••••")) toWrite[key] = value;
  }
  await setMany(toWrite);
  return ok(await getMaskedSettings());
});
