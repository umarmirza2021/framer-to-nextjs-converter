/** Thrown when a requested CMS record does not exist. Maps to HTTP 404. */
export class NotFoundError extends Error {}

/** Thrown on a uniqueness/state conflict (e.g. duplicate slug). Maps to HTTP 409. */
export class ConflictError extends Error {}
