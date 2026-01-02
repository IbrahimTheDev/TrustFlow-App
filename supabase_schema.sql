-- TrustFlow Database Schema for Supabase
-- Run this in Supabase SQL Editor (supabase.com/dashboard -> SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'Free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON public.spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON public.spaces(slug);
CREATE INDEX IF NOT EXISTS idx_testimonials_space_id ON public.testimonials(space_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_liked ON public.testimonials(is_liked);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Spaces policies
CREATE POLICY "Anyone can view spaces" ON public.spaces
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own spaces" ON public.spaces
    FOR ALL USING (auth.uid() = owner_id);

-- Testimonials policies
CREATE POLICY "Anyone can view approved testimonials" ON public.testimonials
    FOR SELECT USING (is_liked = true OR EXISTS (
        SELECT 1 FROM public.spaces 
        WHERE spaces.id = testimonials.space_id 
        AND spaces.owner_id = auth.uid()
    ));

CREATE POLICY "Anyone can insert testimonials" ON public.testimonials
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Space owners can update testimonials" ON public.testimonials
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.spaces 
        WHERE spaces.id = testimonials.space_id 
        AND spaces.owner_id = auth.uid()
    ));

CREATE POLICY "Space owners can delete testimonials" ON public.testimonials
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.spaces 
        WHERE spaces.id = testimonials.space_id 
        AND spaces.owner_id = auth.uid()
    ));

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for videos (create in Supabase Dashboard -> Storage)
-- Bucket name: videos
-- Public: true

-- Storage policies for videos bucket (run in Storage section or SQL)
-- Allow public uploads to videos bucket
-- Allow public reads from videos bucket
