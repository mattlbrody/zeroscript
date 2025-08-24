-- RESTORE the EXACT original match_script function
-- The function must return 4 columns: id, intent, script, similarity

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
    p.intent,
    p.script,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM playbook p
  WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT 1;
END;
$$;

-- NOTE: This restores the EXACT original function structure
-- The edge function already uses match_threshold: 0.4