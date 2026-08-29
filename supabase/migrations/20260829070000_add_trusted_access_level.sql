-- Trusted User access: manager-approved requester trust, distinct from reservation approval.

alter type public.access_level add value if not exists 'trusted';
