// Public CMS API barrel. Generated pages and the admin import from "@/lib/cms".

export * from "./types";
export {
  // collections
  listCollections,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  // items
  listItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  togglePublish,
  // pages & bindings
  listPages,
  registerPage,
  savePageBindings,
  // public content readers (used by generated pages)
  getCMSItems,
  getCMSItem,
} from "./client";
export { applyBindings, extractLayers, type DetectedLayer } from "./bindings";
export { renderCmsIndex, renderCmsDetail, getDetailSlugs } from "./render";
export { regenerateCMSPage, regenerateAllPages } from "./codegen";
export { analyzeFramerPage, type PageAnalysis } from "./detect";
