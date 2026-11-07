ALTER TABLE public.recept
  ADD COLUMN IF NOT EXISTS bild_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Recipe images are publicly readable"
  ON storage.objects;
CREATE POLICY "Recipe images are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'recipe-images');

DROP POLICY IF EXISTS "Users can upload their own recipe images"
  ON storage.objects;
CREATE POLICY "Users can upload their own recipe images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own recipe images"
  ON storage.objects;
CREATE POLICY "Users can update their own recipe images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own recipe images"
  ON storage.objects;
CREATE POLICY "Users can delete their own recipe images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
