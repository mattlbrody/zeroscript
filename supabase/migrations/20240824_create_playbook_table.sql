-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the playbook table
CREATE TABLE IF NOT EXISTS playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL,
  script TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search using IVFFlat
-- This index speeds up cosine similarity searches
CREATE INDEX IF NOT EXISTS playbook_embedding_idx 
ON playbook USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playbook_updated_at 
BEFORE UPDATE ON playbook 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE playbook IS 'Stores sales scripts with their vector embeddings for similarity search';
COMMENT ON COLUMN playbook.intent IS 'The customer intent category (e.g., price_inquiry, feature_question)';
COMMENT ON COLUMN playbook.script IS 'The recommended script for the sales agent to use';
COMMENT ON COLUMN playbook.embedding IS 'Vector embedding of the intent for similarity search (1536 dimensions for text-embedding-3-small)';