-- Public readers get a published-only projection. Drafts stay behind site_pages RLS.
create schema if not exists private;
create table public.site_page_publications (
  slug text primary key,
  title text,
  nav_label text,
  description text,
  show_in_nav boolean,
  nav_order integer,
  published_blocks jsonb,
  published_at timestamptz,
  layout_published jsonb,
  constraint publication_has_content check (published_blocks is not null or layout_published is not null)
);
alter table public.site_page_publications enable row level security;
revoke all on public.site_page_publications from public, anon, authenticated;
grant select on public.site_page_publications to anon, authenticated;
create policy "Public reads published content" on public.site_page_publications
  for select to anon, authenticated using (true);

-- Only the source-table trigger can maintain this projection. No client RPC access.
create function private.sync_site_page_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.site_page_publications where slug = old.slug;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.slug is distinct from new.slug then
    delete from public.site_page_publications where slug = old.slug;
  end if;
  if new.published_blocks is null and new.layout_published is null then
    delete from public.site_page_publications where slug = new.slug;
  else
    insert into public.site_page_publications
      (slug,title,nav_label,description,show_in_nav,nav_order,published_blocks,published_at,layout_published)
    values (new.slug,new.title,new.nav_label,new.description,new.show_in_nav,new.nav_order,new.published_blocks,new.published_at,new.layout_published)
    on conflict (slug) do update set
      title=excluded.title,nav_label=excluded.nav_label,description=excluded.description,
      show_in_nav=excluded.show_in_nav,nav_order=excluded.nav_order,
      published_blocks=excluded.published_blocks,published_at=excluded.published_at,
      layout_published=excluded.layout_published;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_site_page_publication() from public, anon, authenticated;
create trigger sync_site_page_publication after insert or update or delete on public.site_pages
  for each row execute function private.sync_site_page_publication();
insert into public.site_page_publications
  (slug,title,nav_label,description,show_in_nav,nav_order,published_blocks,published_at,layout_published)
select slug,title,nav_label,description,show_in_nav,nav_order,published_blocks,published_at,layout_published
from public.site_pages where published_blocks is not null or layout_published is not null;

create or replace view public.site_published_pages with (security_invoker = true) as
select slug,title,nav_label,description,show_in_nav,nav_order,published_blocks,published_at,layout_published
from public.site_page_publications;
revoke all on public.site_published_pages from public, anon, authenticated;
grant select on public.site_published_pages to anon, authenticated;

-- Clients edit only the protected source table. TRUNCATE bypasses RLS.
revoke all on public.site_pages from public, anon;
revoke truncate, references, trigger on public.site_pages from authenticated;
grant select,insert,update,delete on public.site_pages to authenticated;

-- Contributors can save drafts, but cannot publish either representation.
create or replace function public.guard_site_pages() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  r=public.site_role();
  if tg_op='UPDATE' and r='contributor' and (
    old.published_blocks is distinct from new.published_blocks or
    old.layout_published is distinct from new.layout_published or
    old.published_at is distinct from new.published_at or
    old.slug is distinct from new.slug or old.title is distinct from new.title or
    old.nav_label is distinct from new.nav_label or old.show_in_nav is distinct from new.show_in_nav or
    old.nav_order is distinct from new.nav_order or old.description is distinct from new.description
  ) then raise exception 'Contributors may only edit draft content'; end if;
  return new;
end;
$$;
revoke all on function public.guard_site_pages() from public, anon, authenticated;
alter policy "website team adds pages" on public.site_pages with check (
  (select public.site_role()) = any(array['super_admin','editor','contributor'])
  and ((published_blocks is null and layout_published is null)
    or (select public.site_role()) = any(array['super_admin','editor']))
);
