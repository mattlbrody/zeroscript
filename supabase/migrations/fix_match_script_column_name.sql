-- Fix the match_script function to use the correct column name
-- The table has 'intent_name' column, not 'intent' column

DROP FUNCTION IF EXISTS match_script(vector, float);
DROP FUNCTION IF EXISTS match_script(vector(1536), float);

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
    p.intent_name AS intent,  -- Changed from p.intent to p.intent_name
    p.script,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM playbook p
  WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT 1;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION match_script IS 'Finds the most similar script in the playbook table based on vector similarity using cosine distance';