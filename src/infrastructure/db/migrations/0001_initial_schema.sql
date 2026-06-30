-- Initial schema for Botdoc Lite KPA Reports

CREATE SCHEMA IF NOT EXISTS botdoc;
--> statement-breakpoint

CREATE TABLE "botdoc"."partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "logo" "bytea",
  "logo_mime_type" text,
  "data_filter" jsonb,
  "default_timezone" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
