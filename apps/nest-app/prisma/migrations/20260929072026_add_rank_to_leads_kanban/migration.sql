-- ============================================================
-- Step 1: Add rank column as NOT NULL with a temporary default.
-- The DEFAULT ensures all existing rows are populated instantly
-- without a table scan/lock (Postgres applies it as a catalog
-- default until rows are individually updated).
-- ============================================================
ALTER TABLE "leads" ADD COLUMN "rank" TEXT NOT NULL DEFAULT '000000065536';

-- ============================================================
-- Step 2: Backfill ranks for ALL existing leads so each stage
-- has cards ranked with a 65536-gap (2^16), ordered by creation time.
-- ROW_NUMBER() is partitioned by stage_id so each stage starts
-- independently at slot 1.
--
-- Formula: padded((row_number * 65536), 12 chars)
-- e.g.  row 1 → 000000065536
--        row 2 → 000000131072
--        row 3 → 000000196608
-- ============================================================
UPDATE "leads" AS l
SET "rank" = sub."computed_rank"
FROM (
  SELECT
    id,
    LPAD(
      (ROW_NUMBER() OVER (
        PARTITION BY stage_id
        ORDER BY created_at ASC, id ASC
      ) * 65536)::TEXT,
      12,
      '0'
    ) AS "computed_rank"
  FROM "leads"
) sub
WHERE l.id = sub.id;

-- ============================================================
-- Step 3: Create composite index for Kanban keyset pagination.
-- Covers: WHERE stage_id = $1 AND (rank, id) > ($2, $3)
--         ORDER BY rank ASC, id ASC
-- ============================================================
CREATE INDEX "leads_stage_id_rank_id_idx" ON "leads"("stage_id" ASC, "rank" ASC, "id" ASC);
