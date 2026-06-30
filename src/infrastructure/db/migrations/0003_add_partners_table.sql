-- Add partners table for Botdoc Lite KPA Reports product

CREATE TABLE IF NOT EXISTS "botdoc"."partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "logo" "bytea",
  "logo_mime_type" text,
  "data_filter" jsonb,
  "default_timezone" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
