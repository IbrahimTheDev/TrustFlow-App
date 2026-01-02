#!/usr/bin/env python3
"""
Setup Supabase database schema for TrustFlow
"""
import os
import httpx
import json

# Supabase credentials
SUPABASE_URL = "https://qzxwttsjldtdpwyaesmu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eHd0dHNqbGR0ZHB3eWFlc211Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM0Nzk3OSwiZXhwIjoyMDgyOTIzOTc5fQ.3Kh8Iqp9aMMsSpe48HOv4A9Gvpu6HT2YKoQqm6ZmjpA"

# SQL Schema
SQL_SCHEMA = """
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users manage own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Anyone can view spaces" ON public.spaces;
DROP POLICY IF EXISTS "Anyone can submit testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "View testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Owners manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Owners delete testimonials" ON public.testimonials;

-- Spaces table
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    space_name TEXT NOT NULL,
    logo_url TEXT,
    header_title TEXT DEFAULT 'Share your experience',
    custom_message TEXT,
    collect_star_rating BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('text', 'video')),
    content TEXT,
    video_url TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    respondent_name TEXT NOT NULL,
    respondent_email TEXT,
    respondent_photo_url TEXT,
    is_liked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON public.spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON public.spaces(slug);
CREATE INDEX IF NOT EXISTS idx_testimonials_space_id ON public.testimonials(space_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_liked ON public.testimonials(is_liked);

-- Enable RLS
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Spaces policies
CREATE POLICY "Users manage own spaces" ON public.spaces 
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view spaces" ON public.spaces 
    FOR SELECT USING (true);

-- Testimonials policies  
CREATE POLICY "Anyone can submit testimonials" ON public.testimonials 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "View testimonials" ON public.testimonials 
    FOR SELECT USING (true);

CREATE POLICY "Owners manage testimonials" ON public.testimonials 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.spaces WHERE spaces.id = testimonials.space_id AND spaces.owner_id = auth.uid())
    );

CREATE POLICY "Owners delete testimonials" ON public.testimonials 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.spaces WHERE spaces.id = testimonials.space_id AND spaces.owner_id = auth.uid())
    );
"""

def run_sql_via_api():
    """Try to run SQL via Supabase REST API"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Split SQL into individual statements
    statements = [s.strip() for s in SQL_SCHEMA.split(';') if s.strip() and not s.strip().startswith('--')]
    
    print(f"Found {len(statements)} SQL statements to execute")
    
    # Try the pg/query endpoint (if available)
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"query": SQL_SCHEMA},
            timeout=30
        )
        if response.status_code == 200:
            print("✅ SQL executed successfully via RPC!")
            return True
        else:
            print(f"RPC method not available: {response.status_code}")
    except Exception as e:
        print(f"RPC method failed: {e}")
    
    return False

def verify_tables():
    """Verify that tables exist"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    
    try:
        # Try to query spaces table
        response = httpx.get(
            f"{SUPABASE_URL}/rest/v1/spaces?select=id&limit=1",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            print("✅ 'spaces' table exists!")
            return True
        else:
            print(f"❌ 'spaces' table check: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("TrustFlow Database Setup")
    print("=" * 50)
    
    # First check if tables already exist
    print("\n📋 Checking if tables exist...")
    if verify_tables():
        print("\n✅ Database is already set up!")
    else:
        print("\n⚠️  Tables don't exist yet.")
        print("\n📝 Please run the following SQL in Supabase Dashboard:")
        print("   1. Go to https://supabase.com/dashboard")
        print("   2. Select your project: qzxwttsjldtdpwyaesmu")
        print("   3. Go to SQL Editor")
        print("   4. Paste and run the SQL from /app/supabase_schema.sql")
        
        # Try API method anyway
        print("\n🔄 Attempting API-based setup...")
        run_sql_via_api()
        
        # Re-verify
        print("\n📋 Re-checking tables...")
        verify_tables()
