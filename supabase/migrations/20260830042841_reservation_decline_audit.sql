-- Store who declined a reservation request, when, and the requester-facing reason.
alter table public.reservation_requests
  add column if not exists declined_by uuid references public.users (id),
  add column if not exists declined_at timestamptz,
  add column if not exists decline_reason text;

comment on column public.reservation_requests.declined_by is
  'User who declined the request.';
comment on column public.reservation_requests.declined_at is
  'When the decline decision was recorded.';
comment on column public.reservation_requests.decline_reason is
  'Requester-facing reason for a declined reservation request.';
