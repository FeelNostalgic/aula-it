-- Add order_index to modules to support manual ordering per teacher
ALTER TABLE modules ADD COLUMN IF NOT EXISTS order_index integer;

-- Backfill: assign order based on created_at per teacher
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY teacher_id ORDER BY created_at ASC) - 1 AS rn
  FROM modules
)
UPDATE modules SET order_index = ranked.rn
FROM ranked WHERE modules.id = ranked.id;

-- Set default for new rows
ALTER TABLE modules ALTER COLUMN order_index SET DEFAULT 0;
