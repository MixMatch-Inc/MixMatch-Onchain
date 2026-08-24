CREATE TYPE "public"."escrow_status" AS ENUM('PENDING', 'LOCKED', 'RELEASED', 'REFUNDED', 'FAILED');--> statement-breakpoint
CREATE TABLE "escrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"payer_stellar_account_id" uuid NOT NULL,
	"payee_public_key" text NOT NULL,
	"token_contract_id" text NOT NULL,
	"amount" text NOT NULL,
	"on_chain_escrow_id" text,
	"timeout_ledger" integer,
	"status" "escrow_status" DEFAULT 'PENDING' NOT NULL,
	"deposit_tx_hash" text,
	"finalize_tx_hash" text,
	"failure_code" text,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escrows_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_payer_stellar_account_id_stellar_accounts_id_fk" FOREIGN KEY ("payer_stellar_account_id") REFERENCES "public"."stellar_accounts"("id") ON DELETE cascade ON UPDATE no action;