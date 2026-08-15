-- New users start with 25 credits (was 50). Existing users are unaffected.
ALTER TABLE "user" ALTER COLUMN "credits" SET DEFAULT 25;
