-- Add new columns to members table for more complete member profiles

-- Student ID (M-Number at MTSU)
ALTER TABLE members ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Minor field
ALTER TABLE members ADD COLUMN IF NOT EXISTS minor TEXT;

-- Is the member new this year?
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT false;

-- Expected graduation date
ALTER TABLE members ADD COLUMN IF NOT EXISTS expected_graduation TEXT;

-- Interested in mentor program (as mentee)
ALTER TABLE members ADD COLUMN IF NOT EXISTS wants_mentor BOOLEAN DEFAULT false;

-- Interested in mentor program (as mentor)
ALTER TABLE members ADD COLUMN IF NOT EXISTS wants_to_mentor BOOLEAN DEFAULT false;

-- Notes/suggestions from registration
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add an index for student_id lookups
CREATE INDEX IF NOT EXISTS idx_members_student_id ON members(student_id) WHERE student_id IS NOT NULL;
