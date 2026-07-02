// Pluggable storage for generated-site HTML.
//
// Today every site's HTML is stored INLINE in Postgres (the `Version.code` and
// `WebsiteProject.current_code` columns). That's fine at this scale, and this module
// keeps that behaviour exactly. Its job is to be the SEAM: when DB size actually
// becomes a problem, you move bodies to object storage (Cloudflare R2 / S3 /
// Supabase Storage) by implementing one adapter and flipping STORAGE_DRIVER — no
// call-site rewrite, no data migration for existing rows.
//
// Contract:
//   - put(html)  -> a "reference" string to persist in the DB column.
//   - get(ref)   -> resolves that reference back to the HTML.
// For the inline driver the reference IS the HTML, so existing rows and reads keep
// working untouched.
//
// ──────────────────────────────────────────────────────────────────────────────
// To enable external storage later:
//   1. Implement `s3Store` below (upload returns e.g. `s3://bucket/key`; get fetches it).
//   2. Set STORAGE_DRIVER=s3 (+ bucket/credentials env).
//   3. Route the READ paths through `loadHtml()` so old inline rows AND new
//      references both resolve. Read sites to update:
//        - getProjectPreview         (project.current_code + versions[].code)
//        - getProjectById            (project.current_code)
//        - streamGeneration reconnect (project.current_code)
//        - getUserProject            (project.current_code)
//      The WRITE paths already go through `storeHtml()`.
// ──────────────────────────────────────────────────────────────────────────────

export interface BlobStore {
  put(content: string, hint?: string): Promise<string>;
  get(ref: string): Promise<string>;
}

// Inline (Postgres) driver — zero infrastructure. The reference is the content.
const inlineStore: BlobStore = {
  async put(content) {
    return content;
  },
  async get(ref) {
    return ref;
  },
};

// Selected by env. Add the S3/R2/Supabase driver here behind STORAGE_DRIVER.
const driver = (process.env.STORAGE_DRIVER || 'inline').toLowerCase();

export const blobStore: BlobStore = (() => {
  switch (driver) {
    // case 's3': return s3Store;
    case 'inline':
    default:
      return inlineStore;
  }
})();

/** Store HTML and return the reference to persist in the DB column. */
export const storeHtml = (html: string, hint?: string): Promise<string> => blobStore.put(html, hint);

/** Resolve a stored reference back to HTML (no-op for the inline driver). */
export const loadHtml = (ref: string | null | undefined): Promise<string> =>
  ref == null ? Promise.resolve('') : blobStore.get(ref);
