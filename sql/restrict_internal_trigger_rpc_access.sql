-- Trigger-only functions are not client RPC endpoints.
revoke all on function public.archive_site_original_layout() from public, anon, authenticated;
revoke all on function public.archive_site_page_publication() from public, anon, authenticated;
revoke all on function public.audit_chapter_admin_activity() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
-- This administrative RPC requires a signed-in administrator; retain its internal checks.
revoke all on function public.set_member_permissions(uuid,text[]) from public, anon;
grant execute on function public.set_member_permissions(uuid,text[]) to authenticated;
