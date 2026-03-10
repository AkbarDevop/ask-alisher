CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents_alisher (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  source_url TEXT,
  source_type TEXT CONSTRAINT documents_alisher_source_type_check CHECK (source_type IN (
    'interview', 'article', 'linkedin_post',
    'telegram_post', 'youtube_transcript', 'youtube',
    'presentation', 'bio', 'telegram', 'book', 'linkedin'
  )),
  language TEXT DEFAULT 'en' CONSTRAINT documents_alisher_language_check CHECK (language IN ('en', 'uz', 'ru')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_alisher_embedding_idx ON documents_alisher
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE documents_alisher ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents_alisher'
      AND policyname = 'Allow public read access to Alisher documents'
  ) THEN
    CREATE POLICY "Allow public read access to Alisher documents" ON documents_alisher
      FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION match_alisher_documents(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents_alisher.id,
    documents_alisher.content,
    documents_alisher.source_url,
    documents_alisher.source_type,
    1 - (documents_alisher.embedding <=> query_embedding) AS similarity
  FROM documents_alisher
  WHERE 1 - (documents_alisher.embedding <=> query_embedding) > match_threshold
  ORDER BY documents_alisher.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
