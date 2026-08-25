CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'PENDING_SIGNATURE' BEFORE 'SUCCESS';--> statement-breakpoint
ALTER TABLE "stellar_accounts" ADD COLUMN "multisig_configured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "pending_envelope_xdr" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'USER' NOT NULL;