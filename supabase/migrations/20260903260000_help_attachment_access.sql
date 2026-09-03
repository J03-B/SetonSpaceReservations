-- Help attachment reads use Help access levels, after attachments became JSON.

drop policy if exists tickets_attachments_select on storage.objects;
create policy tickets_attachments_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'help-attachments'
    and (
      public.is_help_admin()
      or public.is_help_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = 'catalog'
      or exists (
        select 1
        from public.tickets t
        cross join lateral jsonb_array_elements(coalesce(t.attachments, '[]'::jsonb)) att
        where att->>'path' = name
          and public.can_see_ticket(t.id, t.requester_id)
      )
    )
  );
