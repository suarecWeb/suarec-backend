-- Migration: Content Moderation System
-- Description: Implements content reports, user blocks, and terms acceptance
-- Required for Apple App Store compliance (Guideline 1.2)

-- =====================================================
-- 1. User Terms Acceptance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    CONSTRAINT unique_user_terms UNIQUE (user_id, terms_version)
);

CREATE INDEX idx_user_terms_user_id ON user_terms_acceptance(user_id);
CREATE INDEX idx_user_terms_accepted_at ON user_terms_acceptance(accepted_at);

-- =====================================================
-- 2. Content Reports Table
-- =====================================================
CREATE TYPE report_content_type AS ENUM (
    'publication',
    'comment',
    'message',
    'user_profile'
);

CREATE TYPE report_reason AS ENUM (
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'sexual_content',
    'misinformation',
    'intellectual_property',
    'illegal_activity',
    'other'
);

CREATE TYPE report_status AS ENUM (
    'pending',
    'under_review',
    'resolved',
    'dismissed'
);

CREATE TABLE IF NOT EXISTS content_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type report_content_type NOT NULL,
    content_id INTEGER NOT NULL,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    CONSTRAINT check_not_self_report CHECK (reporter_id != reported_user_id)
);

CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_reported_user ON content_reports(reported_user_id);
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX idx_content_reports_created_at ON content_reports(created_at DESC);

-- =====================================================
-- 3. User Blocks Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_blocks (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT check_not_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX idx_user_blocks_created_at ON user_blocks(created_at DESC);

-- =====================================================
-- 4. Add Terms Acceptance to Users Table
-- =====================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_accepted_terms BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50) DEFAULT '1.0';

-- =====================================================
-- 5. Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_content_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_reports_updated_at
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_content_reports_updated_at();

-- =====================================================
-- 6. Insert default terms acceptance for existing users
-- =====================================================
-- Note: This assumes existing users implicitly accepted previous terms
INSERT INTO user_terms_acceptance (user_id, terms_version, accepted_at)
SELECT id, '1.0', created_at 
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_terms_acceptance WHERE user_id = users.id
);

-- Update existing users to show they've accepted terms
UPDATE users 
SET has_accepted_terms = true, 
    terms_accepted_at = created_at,
    terms_version = '1.0'
WHERE has_accepted_terms = false;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE user_terms_acceptance IS 'Tracks user acceptance of terms and conditions (EULA)';
COMMENT ON TABLE content_reports IS 'User-generated content reports for moderation';
COMMENT ON TABLE user_blocks IS 'User blocking relationships';
COMMENT ON COLUMN users.has_accepted_terms IS 'Whether user has accepted current terms';
COMMENT ON COLUMN users.terms_accepted_at IS 'When user accepted the current terms';
COMMENT ON COLUMN users.terms_version IS 'Version of terms accepted by user';
