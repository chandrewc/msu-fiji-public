-- Public visitors must not need the private website-role helper to read visible officers.
alter policy "Anyone can view chapter officers" on public.chapter_officers
  to anon using (is_visible);
create policy "Website team reads chapter officers" on public.chapter_officers
  for select to authenticated
  using (is_visible or (select public.site_role()) = any(array['editor','super_admin','contributor']));
