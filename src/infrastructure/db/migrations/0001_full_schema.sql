-- Drop initial simplified tables and rebuild with full schema
DROP TABLE IF EXISTS "botdoc"."reports";
--> statement-breakpoint
DROP TABLE IF EXISTS "botdoc"."recipients";
--> statement-breakpoint
DROP TABLE IF EXISTS "botdoc"."customers";
--> statement-breakpoint

-- customers
CREATE TABLE "botdoc"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo" "bytea",
	"logo_mime_type" text,
	"data_filter" jsonb,
	"avg_cars_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- recipients
CREATE TABLE "botdoc"."recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_name" text,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- email_schedules
CREATE TABLE "botdoc"."email_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_name" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"recurrence" text DEFAULT 'once' NOT NULL,
	"timezone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- email_log
CREATE TABLE "botdoc"."email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_name" text,
	"schedule_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text
);
--> statement-breakpoint

-- reports
CREATE TABLE "botdoc"."reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"period_label" text DEFAULT 'Current Period' NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- foreign keys
ALTER TABLE "botdoc"."recipients" ADD CONSTRAINT "recipients_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "botdoc"."email_schedules" ADD CONSTRAINT "email_schedules_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "botdoc"."email_log" ADD CONSTRAINT "email_log_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "botdoc"."email_log" ADD CONSTRAINT "email_log_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "botdoc"."email_schedules"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "botdoc"."reports" ADD CONSTRAINT "reports_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
