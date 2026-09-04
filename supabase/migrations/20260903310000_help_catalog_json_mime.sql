-- Category catalog is stored as catalog/categories.json in help-attachments.
-- The bucket previously only allowed images/PDF, which blocked saves.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'application/pdf',
  'application/json'
]::text[]
where id = 'help-attachments';
