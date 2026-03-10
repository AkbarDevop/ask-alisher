DO $$
BEGIN
  IF to_regclass('public.documents') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access" ON documents
      FOR SELECT USING (true);
  END IF;
END $$;

-- Block all writes via RLS (only service_role can write, which bypasses RLS)
-- No INSERT/UPDATE/DELETE policies = blocked for anon/authenticated roles

-- Drop the unsafe search_documents function that allows SQL injection
DROP FUNCTION IF EXISTS search_documents(TEXT, INT);
