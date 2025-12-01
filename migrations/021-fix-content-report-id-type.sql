-- Migration: Fix Content Report ID Type
-- Description: Change content_id from INTEGER to VARCHAR to support UUIDs
-- Date: 2025-11-30

-- =====================================================
-- 1. Alter content_reports table to change content_id type
-- =====================================================
ALTER TABLE content_reports 
ALTER COLUMN content_id TYPE VARCHAR(255) USING content_id::text;

-- =====================================================
-- 2. Recreate index on content_id for better performance
-- =====================================================
DROP INDEX IF EXISTS idx_content_reports_content;
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN content_reports.content_id IS 'ID of the reported content (supports both UUIDs and integers as strings)';
