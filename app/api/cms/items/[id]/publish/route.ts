import { handler, ok } from "@/lib/cms/api";
import { togglePublish } from "@/lib/cms/client";

// POST /api/cms/items/[id]/publish — toggle published state
export const POST = handler(async ({ params }) => {
  return ok(await togglePublish(params.id));
});
