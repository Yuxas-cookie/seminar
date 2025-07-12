# Staff Management Migration Guide

## Overview
This guide explains how to add staff management functionality to your Supabase database.

## SQL Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  theme_color VARCHAR(7) UNIQUE NOT NULL, -- HEX color format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add staff_id to seminars table
ALTER TABLE seminars 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_seminars_staff_id ON seminars(staff_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- If staff table already exists, add theme_color column
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) UNIQUE;

-- Update existing staff with default colors
UPDATE staff 
SET theme_color = 
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 1 THEN '#3B82F6'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 2 THEN '#10B981'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 3 THEN '#F59E0B'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 4 THEN '#EF4444'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 5 THEN '#8B5CF6'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 6 THEN '#EC4899'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 7 THEN '#14B8A6'
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 8 THEN '#F97316'
    ELSE '#' || LPAD(TO_HEX(FLOOR(RANDOM() * 16777215)::INT), 6, '0')
  END
WHERE theme_color IS NULL;

-- Make theme_color NOT NULL after setting defaults
ALTER TABLE staff 
ALTER COLUMN theme_color SET NOT NULL;
```

## How to Apply

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL above
4. Click "Run" to execute the migration

## Features Added

1. **Staff Table**: Stores staff member information (name, theme color)
2. **Staff Assignment**: Seminars can now be assigned to specific staff members
3. **Staff Management UI**: New tab in the application to manage staff with color picker
4. **Seminar Assignment**: Staff can be assigned to seminars from the seminar detail modal
5. **Visual Identification**: Each staff member has a unique theme color that appears on their assigned seminars

## Testing

After applying the migration:

1. Go to the application
2. Click on the "スタッフ管理" (Staff Management) tab
3. Add some staff members
4. Go back to the calendar view
5. Click on any seminar
6. You should see a staff selector at the bottom of the modal
7. Assign a staff member to the seminar

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;

-- Remove function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove foreign key and column from seminars
ALTER TABLE seminars DROP COLUMN IF EXISTS staff_id;

-- Drop staff table
DROP TABLE IF EXISTS staff;
```