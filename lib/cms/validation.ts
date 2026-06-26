import { z } from "zod";
import { CMS_FIELD_TYPES } from "./types";

const fieldTypeEnum = z.enum(
  CMS_FIELD_TYPES as [string, ...string[]]
);

export const fieldInputSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  key: z.string().min(1).optional(),
  type: fieldTypeEnum,
  required: z.boolean().optional().default(false),
  defaultValue: z.unknown().optional(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  slug: z.string().min(1).optional(),
  fields: z.array(fieldInputSchema).optional().default([]),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  fields: z.array(fieldInputSchema).optional(),
});

export const createItemSchema = z.object({
  slug: z.string().min(1).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().optional().default(false),
});

export const updateItemSchema = z.object({
  slug: z.string().min(1).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  published: z.boolean().optional(),
});

export const registerPageSchema = z.object({
  collectionId: z.string().min(1),
  pageType: z.enum(["index", "detail"]),
  framerPageId: z.string().min(1),
  route: z.string().min(1),
});

export const bindingSchema = z.object({
  layerId: z.string().min(1),
  layerType: z.enum(["text", "image", "background-image", "href"]),
  collectionId: z.string().min(1),
  fieldKey: z.string().min(1),
  pageType: z.enum(["index", "detail"]),
});

export const saveBindingsSchema = z.object({
  bindings: z.array(bindingSchema),
});

export type FieldInput = z.infer<typeof fieldInputSchema>;
