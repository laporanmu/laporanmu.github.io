-- ============================================================
-- Migration: Create dorm_inventories table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS dorm_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dorm_id TEXT REFERENCES dorms(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    total_quantity INTEGER DEFAULT 1,
    good_condition_count INTEGER DEFAULT 1,
    damaged_condition_count INTEGER DEFAULT 0,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE dorm_inventories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read for authenticated users" ON dorm_inventories
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert/update/delete
CREATE POLICY "Allow write for authenticated users" ON dorm_inventories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for faster lookups by dorm
CREATE INDEX IF NOT EXISTS idx_dorm_inventories_dorm_id ON dorm_inventories(dorm_id);
