-- Knowledge base (RAG): chunked documents with embeddings for a 'knowledge'
-- connection. Embeddings are stored as JSONB arrays (cosine is computed in app),
-- so no pgvector extension is required.

CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES app_connections(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_connection ON kb_chunks(connection_id);

ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
