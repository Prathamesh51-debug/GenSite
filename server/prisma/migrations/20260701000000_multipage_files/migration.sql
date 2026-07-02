-- Multi-page support: store the file set as JSON. Nullable — existing single-file
-- projects/versions keep working off `current_code` / `code`.
ALTER TABLE "WebsiteProject" ADD COLUMN "files" JSONB;
ALTER TABLE "Version" ADD COLUMN "files" JSONB;
