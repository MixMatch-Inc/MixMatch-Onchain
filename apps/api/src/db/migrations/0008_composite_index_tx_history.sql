-- Composite index on (stellar_account_id, created_at DESC) for transaction
-- history pagination queries that sort by recency. Without this index,
-- count(*) + page-select both perform a full table scan per history request.
-- Fixes: #911
CREATE INDEX IF NOT EXISTS "transactions_account_created_at_idx"
  ON "transactions" ("stellar_account_id", "created_at" DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "anchor_transactions_account_created_at_idx"
  ON "anchor_transactions" ("stellar_account_id", "created_at" DESC);
