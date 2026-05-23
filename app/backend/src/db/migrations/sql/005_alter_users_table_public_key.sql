-- Migration: Alter users table to split public_key into public_key_x and public_key_y
-- Description: Removes the public_key TEXT column and adds public_key_x and public_key_y TEXT columns

-- Drop the old public_key column
ALTER TABLE users DROP COLUMN IF EXISTS public_key;

-- Add new columns for public key coordinates
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_x TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_y TEXT;

