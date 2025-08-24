-- Zeroscript Database Setup
-- This SQL file sets up the complete database structure for the Zeroscript Chrome extension
-- Run this in your Supabase SQL Editor to create all necessary tables and policies

-- ============================================
-- 1. ENABLE VECTOR EXTENSION
-- ============================================
-- Enable pgvector for storing embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================
-- 2. CREATE SESSIONS TABLE
-- ============================================
-- Table to store call session data for the "Call Resume" feature
CREATE TABLE IF NOT EXISTS public.sessions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    phone_number TEXT NOT NULL,
    last_stage INTEGER DEFAULT 0,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Additional useful columns
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    session_notes TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create an index on agent_id for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON public.sessions(agent_id);

-- Create an index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_phone_number ON public.sessions(phone_number);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON public.sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. CREATE PLAYBOOK TABLE
-- ============================================
-- Table to store Golden Playbook scripts with vector embeddings
CREATE TABLE IF NOT EXISTS public.playbook (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    intent TEXT NOT NULL,
    script TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    
    -- Additional metadata columns
    category TEXT,
    stage INTEGER,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0
);

-- Create an index on the embedding column for similarity searches
CREATE INDEX IF NOT EXISTS idx_playbook_embedding ON public.playbook 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create an index on intent for text searches
CREATE INDEX IF NOT EXISTS idx_playbook_intent ON public.playbook(intent);

-- Create an index on category for filtering
CREATE INDEX IF NOT EXISTS idx_playbook_category ON public.playbook(category);

-- Create an index on stage for filtering
CREATE INDEX IF NOT EXISTS idx_playbook_stage ON public.playbook(stage);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on both tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR SESSIONS TABLE
-- ============================================
-- Policy: Agents can only see their own sessions
CREATE POLICY "Agents can view own sessions" 
    ON public.sessions 
    FOR SELECT 
    USING (auth.uid() = agent_id);

-- Policy: Agents can only insert sessions for themselves
CREATE POLICY "Agents can insert own sessions" 
    ON public.sessions 
    FOR INSERT 
    WITH CHECK (auth.uid() = agent_id);

-- Policy: Agents can only update their own sessions
CREATE POLICY "Agents can update own sessions" 
    ON public.sessions 
    FOR UPDATE 
    USING (auth.uid() = agent_id)
    WITH CHECK (auth.uid() = agent_id);

-- Policy: Agents can only delete their own sessions
CREATE POLICY "Agents can delete own sessions" 
    ON public.sessions 
    FOR DELETE 
    USING (auth.uid() = agent_id);

-- ============================================
-- 6. CREATE RLS POLICIES FOR PLAYBOOK TABLE
-- ============================================
-- Policy: All authenticated users can read playbook entries
CREATE POLICY "Authenticated users can read playbook" 
    ON public.playbook 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Note: No INSERT, UPDATE, or DELETE policies for playbook table
-- This makes it read-only through the API for all users

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================
-- Function to search for similar intents using vector similarity
CREATE OR REPLACE FUNCTION search_similar_intents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE(
    id bigint,
    intent text,
    script text,
    category text,
    stage integer,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.intent,
        p.script,
        p.category,
        p.stage,
        1 - (p.embedding <=> query_embedding) as similarity
    FROM public.playbook p
    WHERE 
        p.is_active = true
        AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get active session for a phone number and agent
CREATE OR REPLACE FUNCTION get_active_session(
    p_phone_number text,
    p_agent_id uuid
)
RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    phone_number text,
    last_stage integer,
    session_notes text,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.created_at,
        s.phone_number,
        s.last_stage,
        s.session_notes,
        s.updated_at
    FROM public.sessions s
    WHERE 
        s.phone_number = p_phone_number
        AND s.agent_id = p_agent_id
        AND s.is_active = true
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.sessions TO authenticated;
GRANT SELECT ON public.playbook TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_intents TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_session TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON SEQUENCE public.sessions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.playbook_id_seq TO authenticated;

-- ============================================
-- 9. INSERT SAMPLE PLAYBOOK DATA (OPTIONAL)
-- ============================================
-- Uncomment below to insert sample playbook entries
-- Note: You'll need to generate actual embeddings using OpenAI or similar service

/*
INSERT INTO public.playbook (intent, script, category, stage, embedding) VALUES
(
    'Objection: Price',
    'I understand price is important. Let me show you how our solution actually saves money in the long run by...',
    'Objection Handling',
    3,
    -- This is a placeholder - replace with actual 1536-dimension embedding
    ARRAY_FILL(0.1, ARRAY[1536])::vector
),
(
    'Opening: Cold Call',
    'Hi [Name], I know you weren''t expecting my call. I''m reaching out because we''ve helped companies like yours...',
    'Opening',
    1,
    ARRAY_FILL(0.2, ARRAY[1536])::vector
),
(
    'Closing: Trial',
    'Based on what we''ve discussed, it sounds like this could really help your team. How about we start with a 14-day trial?',
    'Closing',
    5,
    ARRAY_FILL(0.3, ARRAY[1536])::vector
);
*/

-- ============================================
-- 10. CREATE VIEW FOR SESSION ANALYTICS
-- ============================================
-- Useful view for tracking agent performance
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    agent_id,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT phone_number) as unique_customers,
    AVG(last_stage) as avg_stage_reached,
    MAX(last_stage) as max_stage_reached,
    DATE(created_at) as session_date
FROM public.sessions
WHERE is_active = true
GROUP BY agent_id, DATE(created_at);

-- Grant read access to the view
GRANT SELECT ON session_analytics TO authenticated;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Your Zeroscript database is now configured with:
-- ✅ pgvector extension for embeddings
-- ✅ sessions table with RLS policies
-- ✅ playbook table with read-only access
-- ✅ Helper functions for common operations
-- ✅ Performance indexes on all key columns
-- ✅ Analytics view for tracking performance