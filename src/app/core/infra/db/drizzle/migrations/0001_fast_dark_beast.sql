CREATE TYPE "public"."auth_providers" AS ENUM('google', 'github', 'local');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"authProvider" "auth_providers" NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"email_at_link" varchar(320),
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"algo" varchar(50) DEFAULT 'argon2id' NOT NULL,
	"needs_rehash" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(320);--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password" ADD CONSTRAINT "password_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_idx_auth_accounts_auth_provider_user" ON "auth_accounts" USING btree ("authProvider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_idx_auth_accounts_user_provider" ON "auth_accounts" USING btree ("user_id","authProvider");--> statement-breakpoint
CREATE INDEX "idx_auth_accounts_user" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uniq_idx_password_user" ON "password" USING btree ("user_id");