-- Additive personal panel. No changes to the existing plan_data table or accounts.
create table public.police_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique check (alias = lower(alias) and length(alias) between 1 and 40)
);
alter table public.police_members enable row level security;
revoke all on public.police_members from public,anon,authenticated;
grant select on public.police_members to authenticated;
grant all on public.police_members to service_role;
create policy "Read own police membership" on public.police_members for select to authenticated using ((select auth.uid())=user_id);

create table public.police_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('prefs','study','coffee','plan','priority','result','training','checkin','goal')),
  day date,
  payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=262144),
  version integer not null default 1 check (version>0),
  updated_at timestamptz not null default now(),
  primary key(user_id,id),
  check (kind='prefs' or day is not null)
);
create unique index police_one_preferences on public.police_records(user_id) where kind='prefs';
create index police_records_kind_day on public.police_records(user_id,kind,day);
alter table public.police_records enable row level security;
revoke all on public.police_records from public,anon,authenticated;
grant select,insert,update,delete on public.police_records to authenticated;
grant all on public.police_records to service_role;
create policy "Read own police records" on public.police_records for select to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Create own police records" on public.police_records for insert to authenticated with check ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Update own police records" on public.police_records for update to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members)) with check ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Delete own police records" on public.police_records for delete to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));

create table public.police_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments)='array' and jsonb_array_length(segments)<=2000),
  phase text not null check (phase in ('study','break','paused')),
  resume_phase text not null check (resume_phase in ('study','break')),
  phase_started_at timestamptz,
  remaining_seconds numeric check (remaining_seconds between 0 and 10800),
  pomodoro boolean not null default false,
  focus_minutes integer not null default 25 check (focus_minutes between 1 and 180),
  break_minutes integer not null default 5 check (break_minutes between 1 and 60),
  version integer not null default 1 check (version>0),
  check ((phase='paused' and phase_started_at is null) or (phase<>'paused' and phase_started_at is not null))
);
alter table public.police_timers enable row level security;
revoke all on public.police_timers from public,anon,authenticated;
grant select,insert,update,delete on public.police_timers to authenticated;
grant all on public.police_timers to service_role;
create policy "Read own police timer" on public.police_timers for select to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Create own police timer" on public.police_timers for insert to authenticated with check ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Update own police timer" on public.police_timers for update to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members)) with check ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));
create policy "Delete own police timer" on public.police_timers for delete to authenticated using ((select auth.uid())=user_id and user_id in (select user_id from public.police_members));

create function public.police_limit_priorities() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.kind='priority' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text||':priority',0));
    if (select count(*) from public.police_records where user_id=new.user_id and kind='priority' and day=new.day and id<>new.id)>=3 then raise exception 'Solo puedes guardar tres prioridades por día.'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.police_limit_priorities() from public,anon,authenticated;
create trigger police_priority_limit before insert or update on public.police_records for each row execute function public.police_limit_priorities();

create function public.police_timer_action(action_name text, expected_session uuid, expected_version integer default null, options jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  owner_id uuid := auth.uid();
  t public.police_timers%rowtype;
  moment timestamptz;
  stopped timestamptz;
  elapsed numeric;
  focus integer;
  rest integer;
  pomo boolean;
  saved_day date;
begin
  if owner_id is null or not exists(select 1 from public.police_members where user_id=owner_id) then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text||':timer',0));
  moment:=clock_timestamp();
  select * into t from public.police_timers where user_id=owner_id for update;
  if action_name='start' then
    if t.user_id is not null then return jsonb_build_object('timer',to_jsonb(t),'server_now',moment); end if;
    if exists(select 1 from public.police_records where user_id=owner_id and id=expected_session) then return jsonb_build_object('timer',null,'finished',expected_session,'server_now',moment); end if;
    focus:=coalesce((options->>'focus_minutes')::integer,25); rest:=coalesce((options->>'break_minutes')::integer,5); pomo:=coalesce((options->>'pomodoro')::boolean,false);
    insert into public.police_timers(user_id,session_id,phase,resume_phase,phase_started_at,pomodoro,focus_minutes,break_minutes,remaining_seconds)
    values(owner_id,expected_session,'study','study',moment,pomo,focus,rest,case when pomo then focus*60 else null end) returning * into t;
    return jsonb_build_object('timer',to_jsonb(t),'server_now',moment);
  end if;
  if t.user_id is null then
    if action_name='finish' and exists(select 1 from public.police_records where user_id=owner_id and id=expected_session and kind='study') then return jsonb_build_object('timer',null,'finished',expected_session,'server_now',moment); end if;
    raise exception 'No hay un cronómetro activo. Actualiza el panel.';
  end if;
  if t.session_id<>expected_session or t.version is distinct from expected_version then raise exception 'El cronómetro cambió en otro dispositivo. Actualiza antes de continuar.' using errcode='40001'; end if;
  if action_name='discard' then delete from public.police_timers where user_id=owner_id; return jsonb_build_object('timer',null,'server_now',moment); end if;
  if action_name not in ('pause','resume','study','break','finish') then raise exception 'Acción no válida'; end if;
  if t.phase<>'paused' then
    stopped:=least(moment,coalesce(t.phase_started_at+t.remaining_seconds*interval '1 second',moment));
    elapsed:=greatest(0,extract(epoch from stopped-t.phase_started_at));
    if elapsed>0 then t.segments:=t.segments||jsonb_build_array(jsonb_build_object('start',t.phase_started_at,'end',stopped,'kind',t.phase)); end if;
    if t.remaining_seconds is not null then t.remaining_seconds:=greatest(0,t.remaining_seconds-elapsed); end if;
    t.resume_phase:=t.phase;
  end if;
  if action_name='finish' then
    if not exists(select 1 from jsonb_array_elements(t.segments) s where s->>'kind'='study' and (s->>'end')::timestamptz>(s->>'start')::timestamptz) then raise exception 'No hay tiempo de estudio para guardar. Puedes descartar el cronómetro.'; end if;
    select ((s->>'start')::timestamptz at time zone coalesce(options->>'timezone','Europe/Madrid'))::date into saved_day from jsonb_array_elements(t.segments) s where s->>'kind'='study' order by (s->>'start')::timestamptz limit 1;
    insert into public.police_records(user_id,id,kind,day,payload) values(owner_id,t.session_id,'study',saved_day,jsonb_build_object('segments',t.segments,'label',left(coalesce(options->>'label',''),120),'note',left(coalesce(options->>'note',''),2000))) on conflict(user_id,id) do nothing;
    delete from public.police_timers where user_id=owner_id;
    return jsonb_build_object('timer',null,'finished',t.session_id,'server_now',moment);
  end if;
  if action_name='pause' then t.phase:='paused'; t.phase_started_at:=null;
  else
    if action_name='resume' then
      t.phase:=t.resume_phase;
      if t.remaining_seconds=0 then raise exception 'El bloque Pomodoro terminó. Inicia un bloque de estudio o descanso.'; end if;
    else
      t.phase:=action_name; t.resume_phase:=action_name;
      t.remaining_seconds:=case when t.pomodoro then (case when action_name='study' then t.focus_minutes else t.break_minutes end)*60 else null end;
    end if;
    t.phase_started_at:=moment;
  end if;
  update public.police_timers set segments=t.segments,phase=t.phase,resume_phase=t.resume_phase,phase_started_at=t.phase_started_at,remaining_seconds=t.remaining_seconds,version=t.version+1 where user_id=owner_id returning * into t;
  return jsonb_build_object('timer',to_jsonb(t),'server_now',moment);
end;
$$;
revoke all on function public.police_timer_action(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.police_timer_action(text,uuid,integer,jsonb) to authenticated;
