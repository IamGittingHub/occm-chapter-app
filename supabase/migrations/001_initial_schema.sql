-- OCCM Chapter Management App - Initial Schema
-- Run this in Supabase SQL Editor to set up the database

-- Committee Members (the leaders doing prayer/outreach)
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_committee_members_user_id ON committee_members(user_id);

-- Chapter Members (the students being prayed for/contacted)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  grade TEXT NOT NULL CHECK (grade IN ('freshman', 'sophomore', 'junior', 'senior', 'grad')),
  major TEXT,
  church TEXT,
  date_of_birth DATE,
  email TEXT,
  phone TEXT,
  is_graduated BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prayer Assignments (which committee member prays for which members)
CREATE TABLE IF NOT EXISTS prayer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  committee_member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  bucket_number INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, period_start)
);

-- Communication Assignments (tracks outreach responsibility)
CREATE TABLE IF NOT EXISTS communication_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  committee_member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'transferred')),
  last_contact_attempt TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Logs (history of all contact attempts)
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES communication_assignments(id) ON DELETE CASCADE,
  committee_member_id UUID NOT NULL REFERENCES committee_members(id),
  contact_date TIMESTAMPTZ DEFAULT NOW(),
  contact_method TEXT CHECK (contact_method IN ('text', 'call', 'email', 'in_person', 'other')),
  notes TEXT,
  was_successful BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer History (tracks when members get reassigned)
CREATE TABLE IF NOT EXISTS transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_committee_member_id UUID NOT NULL REFERENCES committee_members(id),
  to_committee_member_id UUID NOT NULL REFERENCES committee_members(id),
  reason TEXT DEFAULT 'unresponsive_30_days',
  transferred_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings (configurable values)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender);
CREATE INDEX IF NOT EXISTS idx_members_grade ON members(grade);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_prayer_assignments_period ON prayer_assignments(period_start);
CREATE INDEX IF NOT EXISTS idx_communication_assignments_current ON communication_assignments(is_current, status);
CREATE INDEX IF NOT EXISTS idx_communication_assignments_committee ON communication_assignments(committee_member_id, is_current);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is active committee member
CREATE OR REPLACE FUNCTION is_active_committee_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM committee_members
    WHERE user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Members table
CREATE POLICY "Committee can read members" ON members
  FOR SELECT USING (is_active_committee_member());

CREATE POLICY "Committee can insert members" ON members
  FOR INSERT WITH CHECK (is_active_committee_member());

CREATE POLICY "Committee can update members" ON members
  FOR UPDATE USING (is_active_committee_member());

CREATE POLICY "Committee can delete members" ON members
  FOR DELETE USING (is_active_committee_member());

-- RLS Policies: Committee members table
CREATE POLICY "Committee can read committee" ON committee_members
  FOR SELECT USING (is_active_committee_member());

CREATE POLICY "Committee can insert committee" ON committee_members
  FOR INSERT WITH CHECK (is_active_committee_member());

CREATE POLICY "Committee can update own profile" ON committee_members
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies: All other tables - Committee can manage
CREATE POLICY "Committee can manage prayer_assignments" ON prayer_assignments
  FOR ALL USING (is_active_committee_member());

CREATE POLICY "Committee can manage communication_assignments" ON communication_assignments
  FOR ALL USING (is_active_committee_member());

CREATE POLICY "Committee can manage communication_logs" ON communication_logs
  FOR ALL USING (is_active_committee_member());

CREATE POLICY "Committee can manage transfer_history" ON transfer_history
  FOR ALL USING (is_active_committee_member());

CREATE POLICY "Committee can manage app_settings" ON app_settings
  FOR ALL USING (is_active_committee_member());

-- Default settings
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('unresponsive_threshold_days', '30'),
  ('rotation_day_of_month', '1')
ON CONFLICT (setting_key) DO NOTHING;
