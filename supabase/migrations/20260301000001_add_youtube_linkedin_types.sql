-- Add youtube and linkedin_post source types
DO $$
BEGIN
  IF to_regclass('public.documents') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_source_type_check;
  ALTER TABLE documents ADD CONSTRAINT documents_source_type_check
    CHECK (source_type IN (
      'interview', 'article', 'linkedin_post',
      'telegram_post', 'youtube_transcript', 'youtube',
      'presentation', 'bio', 'telegram', 'book', 'linkedin'
    ));
END $$;
