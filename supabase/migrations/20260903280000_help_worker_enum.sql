-- Help access: Worker sits before Manager.
-- Shared enum; Spaces must not use this value.

alter type public.access_level add value if not exists 'worker' before 'manager';
