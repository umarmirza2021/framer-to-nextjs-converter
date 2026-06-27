// Browser-side typed wrappers around the /api/cms endpoints.
import type { CMSCollection, CMSItem, CMSPage } from "./types";
import type { FieldInput } from "./validation";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/cms${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export type CollectionWithCount = CMSCollection & { itemCount: number };

export const cms = {
  // collections
  listCollections: () => req<CollectionWithCount[]>("/collections"),
  createCollection: (data: { name: string; slug?: string; fields?: FieldInput[] }) =>
    req<CMSCollection>("/collections", { method: "POST", body: JSON.stringify(data) }),
  getCollection: (id: string) => req<CMSCollection>(`/collections/${id}`),
  updateCollection: (
    id: string,
    data: { name?: string; slug?: string; fields?: FieldInput[] }
  ) => req<CMSCollection>(`/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCollection: (id: string) =>
    req<{ success: true }>(`/collections/${id}`, { method: "DELETE" }),

  // items
  listItems: (collectionId: string, page = 1) =>
    req<{ items: CMSItem[]; total: number; page: number; pageSize: number }>(
      `/collections/${collectionId}/items?page=${page}`
    ),
  createItem: (
    collectionId: string,
    data: { slug?: string; data: Record<string, unknown>; published?: boolean }
  ) =>
    req<CMSItem>(`/collections/${collectionId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getItem: (id: string) => req<CMSItem>(`/items/${id}`),
  updateItem: (
    id: string,
    data: { slug?: string; data?: Record<string, unknown>; published?: boolean }
  ) => req<CMSItem>(`/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteItem: (id: string) => req<{ success: true }>(`/items/${id}`, { method: "DELETE" }),
  publishItem: (id: string) => req<CMSItem>(`/items/${id}/publish`, { method: "POST" }),

  // pages & bindings
  listPages: () => req<CMSPage[]>("/pages"),
  savePageBindings: (pageId: string, bindings: CMSPage["bindings"]) =>
    req<CMSPage>(`/pages/${pageId}/bindings`, {
      method: "PUT",
      body: JSON.stringify({ bindings }),
    }),
};
