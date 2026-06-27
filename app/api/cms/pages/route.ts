import { handler, ok } from "@/lib/cms/api";
import { listPages, registerPage } from "@/lib/cms/client";
import { registerPageSchema } from "@/lib/cms/validation";

// GET /api/cms/pages — list CMS pages + bindings
export const GET = handler(async () => {
  return ok(await listPages());
});

// POST /api/cms/pages — register a CMS page
export const POST = handler(async ({ req }) => {
  const body = await req.json();
  const data = registerPageSchema.parse(body);
  return ok(await registerPage(data), 201);
});
