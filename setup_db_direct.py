#!/usr/bin/env python3
"""
Setup Supabase database schema for TrustFlow using direct PostgreSQL connection
"""
import psycopg2
from psycopg2 import sql

# Database connection details
DB_HOST = "db.qzxwttsjldtdpwyaesmu.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Abhishek@701826"

# SQL Schema - split into individual statements
SQL_STATEMENTS = [
    # Enable UUID extension
    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
    
    # Create spaces table
    """
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
    )
    """,
    
    # Create testimonials table
    """
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
    )
    """,
    
    # Create indexes
    "CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON public.spaces(owner_id)",
    "CREATE INDEX IF NOT EXISTS idx_spaces_slug ON public.spaces(slug)",
    "CREATE INDEX IF NOT EXISTS idx_testimonials_space_id ON public.testimonials(space_id)",
    "CREATE INDEX IF NOT EXISTS idx_testimonials_is_liked ON public.testimonials(is_liked)",
    
    # Enable RLS
    "ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY",
    
    # Drop existing policies (to avoid conflicts)
    "DROP POLICY IF EXISTS \"Users manage own spaces\" ON public.spaces",
    "DROP POLICY IF EXISTS \"Anyone can view spaces\" ON public.spaces",
    "DROP POLICY IF EXISTS \"Anyone can submit testimonials\" ON public.testimonials",
    "DROP POLICY IF EXISTS \"View testimonials\" ON public.testimonials",
    "DROP POLICY IF EXISTS \"Owners manage testimonials\" ON public.testimonials",
    "DROP POLICY IF EXISTS \"Owners delete testimonials\" ON public.testimonials",
    
    # Create RLS policies for spaces
    """
    CREATE POLICY "Users manage own spaces" ON public.spaces 
        FOR ALL USING (auth.uid() = owner_id)
    """,
    
    """
    CREATE POLICY "Anyone can view spaces" ON public.spaces 
        FOR SELECT USING (true)
    """,
    
    # Create RLS policies for testimonials
    """
    CREATE POLICY "Anyone can submit testimonials" ON public.testimonials 
        FOR INSERT WITH CHECK (true)
    """,
    
    """
    CREATE POLICY "View testimonials" ON public.testimonials 
        FOR SELECT USING (true)
    """,
    
    """
    CREATE POLICY "Owners manage testimonials" ON public.testimonials 
        FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.spaces WHERE spaces.id = testimonials.space_id AND spaces.owner_id = auth.uid())
        )
    """,
    
    """
    CREATE POLICY "Owners delete testimonials" ON public.testimonials 
        FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.spaces WHERE spaces.id = testimonials.space_id AND spaces.owner_id = auth.uid())
        )
    """,
]

def run_setup():
    print("=" * 60)
    print("TrustFlow Database Setup - Direct PostgreSQL Connection")
    print("=" * 60)
    
    try:
        print(f"\n🔌 Connecting to {DB_HOST}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            sslmode='require'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        print("✅ Connected successfully!")
        
        print(f"\n📝 Executing {len(SQL_STATEMENTS)} SQL statements...\n")
        
        for i, statement in enumerate(SQL_STATEMENTS, 1):
            try:
                # Get first line for description
                desc = statement.strip().split('\n')[0][:60]
                print(f"  [{i}/{len(SQL_STATEMENTS)}] {desc}...")
                cursor.execute(statement)
                print(f"       ✅ Success")
            except psycopg2.Error as e:
                if "already exists" in str(e) or "duplicate" in str(e).lower():
                    print(f"       ⚠️  Already exists (skipped)")
                else:
                    print(f"       ❌ Error: {e}")
        
        # Verify tables
        print("\n📋 Verifying tables...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('spaces', 'testimonials')
        """)
        tables = cursor.fetchall()
        
        if len(tables) >= 2:
            print("✅ Tables created successfully:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print(f"⚠️  Expected 2 tables, found {len(tables)}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("🎉 Database setup complete!")
        print("=" * 60)
        return True
        
    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    run_setup()
