-- Run this script in the Supabase SQL Editor to update your database schema.

-- Add missing columns to 'bills' table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_days INTEGER[];
ALTER TABLE bills ADD COLUMN IF NOT EXISTS total_installments INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_installments INTEGER;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS occurrence TEXT;

-- Update 'profiles' table if you haven't already
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pay_period_semi_monthly_days INTEGER[];

-- Optional: Rename 'frequency' to 'occurrence' if you have existing data
-- DO NOT RUN if you don't have a 'frequency' column
-- ALTER TABLE bills RENAME COLUMN frequency TO occurrence;
