-- Supabase Database Schema for Initra Home inventroymanagement app by issac
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS warranty_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  barcode TEXT,
  qr_value TEXT NOT NULL,
  warranty_start TIMESTAMPTZ,
  warranty_end TIMESTAMPTZ,
  warranty_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_code)
);

-- Warranty documents table
CREATE TABLE IF NOT EXISTS warranty_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_data TEXT NOT NULL, -- Base64 encoded image
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
-- Products: Users can only see their own products
DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- Warranty documents: Users can only see their own documents
DROP POLICY IF EXISTS "Users can view own warranty documents" ON warranty_documents;
CREATE POLICY "Users can view own warranty documents"
  ON warranty_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own warranty documents" ON warranty_documents;
CREATE POLICY "Users can insert own warranty documents"
  ON warranty_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own warranty documents" ON warranty_documents;
CREATE POLICY "Users can update own warranty documents"
  ON warranty_documents FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own warranty documents" ON warranty_documents;
CREATE POLICY "Users can delete own warranty documents"
  ON warranty_documents FOR DELETE
  USING (auth.uid() = user_id);

-- User profiles: Users can view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(user_id, item_code);
CREATE INDEX IF NOT EXISTS idx_warranty_documents_user_id ON warranty_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_documents_product_id ON warranty_documents(product_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

