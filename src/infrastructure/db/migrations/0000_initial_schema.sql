CREATE TABLE "botdoc"."customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" "bytea",
	"data_filter" jsonb DEFAULT '{}' NOT NULL,
	"avg_cars_config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "botdoc"."recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "botdoc"."reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" jsonb DEFAULT '{}' NOT NULL,
	"pdf" "bytea",
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "botdoc"."recipients" ADD CONSTRAINT "recipients_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "botdoc"."reports" ADD CONSTRAINT "reports_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "botdoc"."customers"("id") ON DELETE cascade ON UPDATE no action;
