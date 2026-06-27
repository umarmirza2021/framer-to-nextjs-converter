import { handler, ok } from "@/lib/cms/api";
import { savePageBindings } from "@/lib/cms/client";
import { saveBindingsSchema } from "@/lib/cms/validation";

// PUT /api/cms/pages/[id]/bindings — save all bindings for a page
export const PUT = handler(async ({ req, params }) => {
  const body = await req.json();
  const { bindings } = saveBindingsSchema.parse(body);
  return ok(await savePageBindings(params.id, bindings));
});
