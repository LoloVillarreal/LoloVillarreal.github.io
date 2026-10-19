create table public.plan_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 180),
  value jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 4194304),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,key)
);
alter table public.plan_data enable row level security;
revoke all on public.plan_data from anon;
grant select,insert,update,delete on public.plan_data to authenticated;
create policy "Read own plan" on public.plan_data for select to authenticated using ((select auth.uid())=user_id);
create policy "Insert own plan" on public.plan_data for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update own plan" on public.plan_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Delete own plan" on public.plan_data for delete to authenticated using ((select auth.uid())=user_id);
create function public.replace_plan_data(entries jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries)>10000 then raise exception 'Invalid backup'; end if;
  if exists(select 1 from jsonb_array_elements(entries) as e where jsonb_typeof(e->'value')<>'object' or e->>'key' is null) then raise exception 'Invalid entry'; end if;
  delete from public.plan_data where user_id=auth.uid();
  insert into public.plan_data(user_id,key,value)
    select auth.uid(),e->>'key',e->'value' from jsonb_array_elements(entries) as e;
end;
$$;
revoke all on function public.replace_plan_data(jsonb) from public,anon;
grant execute on function public.replace_plan_data(jsonb) to authenticated;
