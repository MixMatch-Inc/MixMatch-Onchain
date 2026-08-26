ALTER TABLE "stellar_accounts" ALTER COLUMN "encrypted_secret_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stellar_accounts" ADD COLUMN "signing_key_id" text;