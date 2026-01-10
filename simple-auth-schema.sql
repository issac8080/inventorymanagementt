-- Simple Authentication Schema
-- Run this in your Supabase SQL Editor

-- Create app_users table for simple mobile + password authentication
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Plaintext storage as requested
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for app_users (since we're using simple auth)
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Create index for faster mobile lookups
CREATE INDEX IF NOT EXISTS idx_app_users_mobile ON app_users(mobile);

-- Update products table to use app_users instead of auth.users
-- First, let's add a mobile field to track which user owns the product
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_mobile TEXT;

-- Update warranty_documents similarly
ALTER TABLE warranty_documents ADD COLUMN IF NOT EXISTS user_mobile TEXT;

-- Note: You may want to migrate existing data from user_id to user_mobile
-- This is a simple migration - you can run it after creating the app_users table

