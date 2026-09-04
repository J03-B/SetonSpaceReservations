-- Managers need to save category descriptions/workers in catalog/categories.json.
drop policy if exists tickets_attachments_insert on storage.objects;
create policy tickets_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'help-attachments'
    and (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        and public.ticket_email_verified()
      )
      or (
        (storage.foldername(name))[1] = 'catalog'
        and public.is_help_staff()
      )
    )
  );

drop policy if exists tickets_attachments_update on storage.objects;
create policy tickets_attachments_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'help-attachments'
    and (storage.foldername(name))[1] = 'catalog'
    and public.is_help_staff()
  )
  with check (
    bucket_id = 'help-attachments'
    and (storage.foldername(name))[1] = 'catalog'
    and public.is_help_staff()
  );
