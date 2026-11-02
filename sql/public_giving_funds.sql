-- Guest gifts share the existing Stripe event ledger; no public donation reads/writes.
alter table public.stripe_donations alter column member_id drop not null;
alter table public.stripe_donations add column fund text not null default 'alumni' check (fund in ('alumni','persistence','parents'));
alter table public.stripe_donations add constraint guest_donation_requires_fund check (member_id is not null or fund in ('persistence','parents'));
-- Existing RLS, client grants, test-only constraint, and event processor stay in force.
