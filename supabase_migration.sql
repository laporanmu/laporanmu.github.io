-- Migration: Create student_semester_reports table for Semester-based reports
-- Tipe Raport: Pondok Lisan, Pondok Mapel, dan Raport Umum

CREATE TABLE IF NOT EXISTS student_semester_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,            -- 'pondok_lisan' | 'pondok_mapel' | 'umum'
  semester INT NOT NULL,                -- 1 = Ganjil, 2 = Genap
  academic_year TEXT NOT NULL,          -- '2025/2026'
  scores JSONB NOT NULL DEFAULT '{}',   -- Dynamic: {"tajwid": 85, "hafalan": 90, ...}
  extras JSONB DEFAULT '{}',            -- Catatan, kehadiran, BB, TB, dll.
  musyrif_name TEXT,
  updated_by UUID,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, report_type, semester, academic_year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_semester_reports_type ON student_semester_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_semester_reports_lookup ON student_semester_reports(student_id, report_type, semester, academic_year);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_student_semester_reports_updated_at
    BEFORE UPDATE ON student_semester_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
