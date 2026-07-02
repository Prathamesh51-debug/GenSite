-- Per-project generation model choice ('auto' or an OpenRouter model id). Nullable = auto.
ALTER TABLE "WebsiteProject" ADD COLUMN "model" TEXT;
