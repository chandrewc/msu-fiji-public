revoke insert,update,delete,truncate,references,trigger on public.chapter_officers,public.chapter_settings from anon;
revoke truncate,references,trigger on public.chapter_officers,public.chapter_settings from authenticated;
grant select on public.chapter_officers,public.chapter_settings to anon,authenticated;
