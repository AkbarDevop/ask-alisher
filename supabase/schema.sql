-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Alisher-specific documents table for storing chunked content + embeddings
CREATE TABLE documents_alisher (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  embedding   VECTOR(768),
  source_url  TEXT,
  source_type TEXT CHECK (source_type IN (
    'interview', 'article', 'linkedin_post',
    'telegram_post', 'youtube_transcript', 'youtube',
    'presentation', 'bio', 'telegram', 'book', 'linkedin'
  )),
  language    TEXT DEFAULT 'en' CHECK (language IN ('en', 'uz', 'ru')),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index (HNSW for better recall on small corpus)
CREATE INDEX documents_alisher_embedding_idx ON documents_alisher
  USING hnsw (embedding vector_cosine_ops);

-- Search function called from the API route
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
