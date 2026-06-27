-- Update guest-ids bucket to be public so public URLs can load the uploaded ID cards
UPDATE storage.buckets 
SET public = true 
WHERE id = 'guest-ids';

-- Create policy to allow public read access on guest-ids bucket for displaying ID cards
CREATE POLICY "Anyone can view guest IDs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'guest-ids');
