-- Every chapter leadership position is public; editing remains restricted.
alter policy "Anyone can view chapter officers" on public.chapter_officers to anon using (true);
alter policy "Website team reads chapter officers" on public.chapter_officers to authenticated using (true);
