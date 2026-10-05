-- Sites are single-page now; the per-page file maps are no longer read or written.
-- Apply only after the code that stops using these columns is deployed.
ALTER TABLE "WebsiteProject" DROP COLUMN "files";
ALTER TABLE "Version" DROP COLUMN "files";
