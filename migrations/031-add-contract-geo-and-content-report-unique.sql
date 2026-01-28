-- Add latitude/longitude to contracts and unique constraint for content reports

-- Contracts: add optional geolocation fields
ALTER TABLE contract
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE contract
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Content reports: enforce one report per reporter/content pair
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_reporter_content'
    ) THEN
        ALTER TABLE content_reports
        ADD CONSTRAINT uq_reporter_content UNIQUE (reporter_id, content_type, content_id);
    END IF;
END $$;
