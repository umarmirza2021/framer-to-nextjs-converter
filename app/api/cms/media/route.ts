import { handler, ok, fail } from "@/lib/cms/api";
import { listMedia, uploadMedia } from "@/lib/cms/media";

// GET /api/cms/media — list uploaded media
export const GET = handler(async () => {
  return ok({ media: await listMedia() });
});

// POST /api/cms/media — upload an image (multipart/form-data, field "file")
export const POST = handler(async ({ req }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided", 400);
  if (!file.type.startsWith("image/")) return fail("Only image files are allowed", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadMedia(file.name, buffer, file.type);
  return ok({ url }, 201);
});
