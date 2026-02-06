-- =====================================================
-- LAPORANMU - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends Supabase Auth users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'pengurus')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- ACADEMIC YEARS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "2024/2025"
  semester TEXT NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read" ON academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage" ON academic_years FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- CLASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "XII IPA 1"
  grade TEXT NOT NULL, -- e.g. "XII"
  major TEXT, -- e.g. "IPA"
  homeroom_teacher_id UUID REFERENCES profiles(id),
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage" ON classes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- STUDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_code TEXT UNIQUE NOT NULL, -- e.g. "REG-7K3Q-9P2X"
  pin TEXT NOT NULL, -- 4-digit PIN for parent access
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),
  phone TEXT, -- Parent's phone number
  total_points INTEGER DEFAULT 0,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru'))
);

-- =====================================================
-- VIOLATION TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS violation_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  points INTEGER NOT NULL, -- Negative for violations, positive for achievements
  category TEXT NOT NULL,
  is_negative BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE violation_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read" ON violation_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage" ON violation_types FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  violation_type_id UUID NOT NULL REFERENCES violation_types(id),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  points INTEGER NOT NULL,
  notes TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create" ON reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru', 'pengurus'))
);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- e.g. 'CREATE_REPORT', 'UPDATE_STUDENT', etc.
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to auto-update student points when report is created
CREATE OR REPLACE FUNCTION update_student_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students
  SET total_points = total_points + NEW.points,
      updated_at = NOW()
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_report_created
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_student_points();

-- Function to create profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guru')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample violation types
INSERT INTO violation_types (name, points, category, is_negative) VALUES
  ('Terlambat', -5, 'Kedisiplinan', true),
  ('Tidak mengerjakan PR', -10, 'Akademik', true),
  ('Makan di kelas', -3, 'Tata Tertib', true),
  ('Tidak memakai seragam lengkap', -5, 'Tata Tertib', true),
  ('Berkelahi', -25, 'Kedisiplinan', true),
  ('Juara Kelas', 20, 'Prestasi', false),
  ('Membantu Guru', 5, 'Sikap', false),
  ('Juara Lomba', 30, 'Prestasi', false)
ON CONFLICT DO NOTHING;
