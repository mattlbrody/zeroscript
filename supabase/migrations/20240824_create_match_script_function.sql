-- Create the match_script function for vector similarity search
CREATE OR REPLACE FUNCTION match_script(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id bigint,
  intent text,
  script text,
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
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM playbook p
  -- Threshold filter temporarily removed for debugging
  -- WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT 1;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION match_script IS 'Finds the most similar script in the playbook table based on vector similarity using cosine distance';