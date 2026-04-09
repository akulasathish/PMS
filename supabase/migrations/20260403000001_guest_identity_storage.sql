-- Create a bucket for guest IDs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('guest-ids', 'guest-ids', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated staff to view IDs
CREATE POLICY "Staff can view guest IDs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'guest-ids');

-- Policy to allow public uploads (via the magic link)
-- Note: In a production app, we would use a signed URL or a more restrictive policy
-- but for the MVP, we allow uploads to this specific bucket.
CREATE POLICY "Anyone can upload guest IDs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'guest-ids');
