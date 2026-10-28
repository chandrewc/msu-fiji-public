-- Verify public reading does not depend on site_role() or the legacy visibility flag.
begin;
do $$
declare expected integer; affected integer;
begin
  select count(*) into expected from public.chapter_officers;
  update public.chapter_officers set is_visible=false where id=(select id from public.chapter_officers limit 1);
  execute 'set local role anon';
  if (select count(*) from public.chapter_officers)<>expected then raise exception 'Public leadership access failed';end if;
  perform value from public.chapter_settings;
  begin update public.chapter_officers set name='Unauthorized';raise exception 'Public officer edit allowed';exception when insufficient_privilege then null;end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role authenticated';
  if (select count(*) from public.chapter_officers)<>expected then raise exception 'Signed-in leadership access failed';end if;
  update public.chapter_officers set name='Unauthorized';get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Ordinary account can edit officers';end if;
  execute 'reset role';
end;
$$;
rollback;
select 'PASS: all officers public regardless of legacy flag; public settings readable; editing restricted; fixture rolled back' as result;
