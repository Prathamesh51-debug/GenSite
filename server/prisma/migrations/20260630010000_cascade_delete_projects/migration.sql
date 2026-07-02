-- Allow deleting a user to cascade to their projects (and, via existing cascades,
-- their conversations/versions). Previously the FK defaulted to RESTRICT, so any
-- user with at least one project could not delete their account.
ALTER TABLE "WebsiteProject" DROP CONSTRAINT "WebsiteProject_userId_fkey";
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
