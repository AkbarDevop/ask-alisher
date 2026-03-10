-- Switch the legacy documents table from OpenAI 1536D embeddings to Gemini 768D embeddings.
DO $$
BEGIN
  IF to_regclass('public.documents') IS NULL THEN
    RETURN;
  END IF;

  DROP INDEX IF EXISTS documents_embedding_idx;

  BEGIN
    EXECUTE (
      SELECT string_agg('DROP INDEX IF EXISTS ' || indexname, '; ')
      FROM pg_indexes
      WHERE tablename = 'documents'
        AND indexdef LIKE '%vector_cosine_ops%'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  ALTER TABLE documents
    ALTER COLUMN embedding TYPE VECTOR(768);

  CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
    USING hnsw (embedding vector_cosine_ops);

  EXECUTE $function$
    CREATE OR REPLACE FUNCTION match_documents(
      query_embedding VECTOR(768),
      match_threshold FLOAT DEFAULT 0.3,
      match_count INT DEFAULT 10
    )
    RETURNS TABLE (
      id BIGINT,
      content TEXT,
      source_url TEXT,
      source_type TEXT,
      similarity FLOAT
    )
    LANGUAGE plpgsql
    AS $inner$
    BEGIN
      RETURN QUERY
      SELECT
        documents.id,
        documents.content,
        documents.source_url,
        documents.source_type,
        1 - (documents.embedding <=> query_embedding) AS similarity
      FROM documents
      WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
      ORDER BY documents.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $inner$;
  $function$;
END $$;
