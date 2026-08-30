-- Public bucket for email/brand assets. Public object URLs work without a
-- SELECT policy; a broad SELECT policy would also make the bucket listable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand',
  'brand',
  true,
  1048576,
  array['image/png']::text[]
);
