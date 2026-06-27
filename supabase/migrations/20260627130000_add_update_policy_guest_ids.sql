-- Policy to allow anyone (public) to update/overwrite objects in guest-ids bucket
-- This is necessary to support upsert operations on client-side camera captures
CREATE POLICY "Anyone can update guest IDs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'guest-ids')
WITH CHECK (bucket_id = 'guest-ids');

-- Policy to allow anyone (public) to delete objects in guest-ids bucket (useful for retake/void)
CREATE POLICY "Anyone can delete guest IDs"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'guest-ids');
