import { handler, ok } from "@/lib/cms/api";
import { createCollection, listCollections } from "@/lib/cms/client";
import { createCollectionSchema } from "@/lib/cms/validation";

// GET /api/cms/collections — list all collections
export const GET = handler(async () => {
  return ok(await listCollections());
});

// POST /api/cms/collections — create a collection
export const POST = handler(async ({ req }) => {
  const body = await req.json();
  const data = createCollectionSchema.parse(body);
  return ok(await createCollection(data), 201);
});
