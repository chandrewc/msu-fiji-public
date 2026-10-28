-- Run as a database administrator. All fixtures and role changes roll back.
begin;
do $$
declare fixture text := 'security-check-' || gen_random_uuid()::text;
        draft text := fixture || '-draft';
        admin_id uuid;
        affected integer;
begin
  select p.user_id into admin_id from public.site_permissions p join public.members m on m.user_id=p.user_id
    where p.role='super_admin' and m.approved and not m.rejected limit 1;
  if admin_id is null then raise exception 'An approved website super admin is required for this test'; end if;
  insert into public.site_pages(slug,title,draft_blocks,published_blocks)
    values(fixture,'Security fixture','[{"private":"draft"}]','[{"type":"text","text":"Published fixture"}]'),
          (draft,'Private fixture','[{"private":"never public"}]',null);
  execute 'set local role anon';
  if (select count(*) from public.site_published_pages where slug=fixture)<>1 then raise exception 'Public read failed'; end if;
  if exists(select 1 from public.site_published_pages where slug=draft) then raise exception 'Draft exposed'; end if;
  begin perform draft_blocks from public.site_pages where slug=fixture;raise exception 'Anonymous draft read allowed';exception when insufficient_privilege then null;end;
  begin update public.site_published_pages set title='Unauthorized' where slug=fixture;raise exception 'Anonymous view write allowed';exception when insufficient_privilege then null;end;
  begin delete from public.site_page_publications where slug=fixture;raise exception 'Anonymous publication delete allowed';exception when insufficient_privilege then null;end;
  begin truncate public.site_pages;raise exception 'Anonymous truncate allowed';exception when insufficient_privilege then null;end;
  execute 'reset role';
  perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role authenticated';
  if (select count(*) from public.site_published_pages where slug=fixture)<>1 then raise exception 'Signed-in public read failed';end if;
  if exists(select 1 from public.site_pages where slug=fixture) then raise exception 'Ordinary account sees drafts';end if;
  update public.site_pages set title='Unauthorized' where slug=fixture;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Ordinary account can edit source';end if;
  begin update public.site_published_pages set title='Unauthorized' where slug=fixture;raise exception 'Signed-in view write allowed';exception when insufficient_privilege then null;end;
  begin truncate public.site_pages;raise exception 'Signed-in truncate allowed';exception when insufficient_privilege then null;end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not exists(select 1 from public.site_pages where slug=fixture and draft_blocks is not null) then raise exception 'Admin draft read failed';end if;
  update public.site_pages set title='Updated fixture' where slug=fixture;
  if not exists(select 1 from public.site_published_pages where slug=fixture and title='Updated fixture') then raise exception 'Publish sync failed';end if;
  update public.site_pages set published_blocks=null where slug=fixture;
  if exists(select 1 from public.site_published_pages where slug=fixture) then raise exception 'Unpublish failed';end if;
  update public.site_pages set layout_published='{"text":{}}' where slug=fixture;
  if not exists(select 1 from public.site_published_pages where slug=fixture) then raise exception 'Layout publish failed';end if;
  delete from public.site_pages where slug=fixture;
  if exists(select 1 from public.site_published_pages where slug=fixture) then raise exception 'Delete sync failed';end if;
  execute 'reset role';
  -- Temporarily exercise a contributor using the same approved fixture identity.
  update public.site_permissions set role='contributor' where user_id=admin_id;
  execute 'set local role authenticated';
  update public.site_pages set draft_blocks='[{"type":"text","text":"Draft edit"}]' where slug=draft;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Contributor draft save failed';end if;
  begin
    update public.site_pages set layout_published='{}' where slug=draft;
    raise exception 'Contributor layout publication allowed';
  exception when raise_exception then
    if sqlerrm <> 'Contributors may only edit draft content' then raise;end if;
  end;
  begin
    insert into public.site_pages(slug,title,layout_published) values(fixture||'-forbidden','Forbidden','{}');
    raise exception 'Contributor insert publication allowed';
  exception when insufficient_privilege then null;end;
  execute 'reset role';
end;
$$;
rollback;
select 'PASS: public reads, private drafts, denied writes/truncate, admin publishing/unpublishing/deleting, contributor draft-only edits; fixtures rolled back' as result;
