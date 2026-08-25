CREATE TYPE "public"."anchor_transaction_kind" AS ENUM('deposit', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."anchor_transaction_status" AS ENUM('incomplete', 'pending_user_transfer_start', 'pending_user_transfer_complete', 'pending_external', 'pending_anchor', 'pending_stellar', 'pending_trust', 'pending_user', 'on_hold', 'completed', 'refunded', 'expired', 'error');--> statement-breakpoint
CREATE TABLE "anchor_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stellar_account_id" uuid NOT NULL,
	"kind" "anchor_transaction_kind" NOT NULL,
	"asset_code" text NOT NULL,
	"home_domain" text NOT NULL,
	"sep24_transaction_id" text NOT NULL,
	"status" "anchor_transaction_status" NOT NULL,
	"interactive_url" text,
	"more_info_url" text,
	"amount_in" text,
	"amount_out" text,
	"stellar_transaction_id" text,
	"external_transaction_id" text,
	"message" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anchor_transactions_sep24_transaction_id_unique" UNIQUE("sep24_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "anchor_transactions" ADD CONSTRAINT "anchor_transactions_stellar_account_id_stellar_accounts_id_fk" FOREIGN KEY ("stellar_account_id") REFERENCES "public"."stellar_accounts"("id") ON DELETE cascade ON UPDATE no action;