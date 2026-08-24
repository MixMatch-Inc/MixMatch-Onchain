ALTER TABLE "transactions" ADD COLUMN "receive_asset_code" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receive_asset_issuer" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "dest_amount" text;