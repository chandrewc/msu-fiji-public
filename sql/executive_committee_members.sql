-- Committee names belong to their executive position and use its existing RLS policies.
-- Keep existing photo values for compatibility; only Cabinet renders/edits photos.
alter table public.chapter_officers
  add column committee_members text[] not null default '{}'::text[],
  add constraint chapter_officers_committee_members_check check (
    (category = 'executive' or cardinality(committee_members) = 0)
    and array_position(committee_members, null) is null
    and array_position(committee_members, '') is null
    and (cardinality(committee_members) = 0 or array_ndims(committee_members) = 1)
  );
