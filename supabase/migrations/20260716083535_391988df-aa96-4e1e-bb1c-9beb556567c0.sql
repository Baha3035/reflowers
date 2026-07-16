drop policy if exists "Users can view conversation partner profiles" on public.profiles;

create or replace function private.is_conversation_participant(_other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations
    where (buyer_id = auth.uid() and seller_id = _other_id)
       or (seller_id = auth.uid() and buyer_id = _other_id)
  );
$$;

grant execute on function private.is_conversation_participant(uuid) to authenticated;
grant execute on function private.is_conversation_participant(uuid) to service_role;

drop function if exists public.is_conversation_participant(uuid);

create policy "Users can view conversation partner profiles"
on public.profiles
for select
using (
  auth.uid() = id
  or private.is_conversation_participant(id)
  or private.has_role(auth.uid(), 'admin'::app_role)
);
