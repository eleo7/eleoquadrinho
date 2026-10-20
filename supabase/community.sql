-- Execute este arquivo inteiro no SQL Editor do Supabase. Pode ser executado novamente.
begin;
create table if not exists public.community_friends (
  requester uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  blocker uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check(requester <> recipient),
  check((status = 'blocked' and blocker in (requester,recipient)) or (status <> 'blocked' and blocker is null))
);
create unique index if not exists community_friend_pair on public.community_friends(least(requester,recipient),greatest(requester,recipient));
create index if not exists community_friend_requester on public.community_friends(requester);
create index if not exists community_friend_recipient on public.community_friends(recipient);
create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid references public.profiles(id) on delete cascade,
  channel text not null check(channel in ('general','suggestions','private')),
  body text not null check(char_length(body) between 1 and 2000),
  status text not null default 'open' check(status in ('open','planned','done')),
  created_at timestamptz not null default now(),
  check((channel = 'private' and recipient is not null and recipient <> sender) or (channel <> 'private' and recipient is null))
);
create index if not exists community_feed on public.community_messages(channel,id desc);
create index if not exists community_inbox on public.community_messages(recipient,sender,id desc);
create index if not exists community_sender on public.community_messages(sender,created_at desc);
create table if not exists public.community_limits (
  actor uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('send','request')),
  day date not null default current_date,
  total integer not null default 0,
  last_at timestamptz,
  primary key(actor,kind)
);
alter table public.community_limits enable row level security;
revoke all on public.community_limits from public, anon, authenticated;
-- All access is through the authenticated server RPC, never directly from a browser.
alter table public.community_friends enable row level security;
alter table public.community_messages enable row level security;
revoke all on public.community_friends, public.community_messages from public, anon, authenticated;
create or replace function public.community_rate(account_id uuid, operation text)
returns void language plpgsql security definer set search_path = '' as $$
declare quota public.community_limits;
begin
    insert into public.community_limits(actor,kind) values(account_id,operation) on conflict do nothing;
    select * into quota from public.community_limits where community_limits.actor=account_id and kind=operation for update;
    if operation='send' and quota.last_at>now()-interval '3 seconds' then raise exception 'Wait before sending again'; end if;
    if quota.day=current_date and quota.total>=(case when operation='send' then 500 else 30 end) then
      if operation='send' then raise exception 'Daily message limit'; else raise exception 'Daily request limit'; end if;
    end if;
    update public.community_limits set day=current_date,total=case when quota.day=current_date then quota.total+1 else 1 end,last_at=now()
      where community_limits.actor=account_id and kind=operation;
end;
$$;
revoke all on function public.community_rate(uuid,text) from public, anon, authenticated, service_role;
create or replace function public.community_action(actor uuid, operation text, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target uuid; channel_name text; content text; before_id bigint; message_id bigint;
  relation public.community_friends; message public.community_messages; result jsonb;
  is_admin boolean; term text;
begin
  select role = 'admin' into is_admin from public.profiles where id = actor;
  if is_admin is null then raise exception 'Account required'; end if;
  if operation = 'people' then
    term := lower(trim(coalesce(payload->>'query','')));
    if length(term) < 3 or length(term) > 32 or term !~ '^[a-z0-9_-]+$' then return '[]'::jsonb; end if;
    select coalesce(jsonb_agg(to_jsonb(p)), '[]') into result from
      (select id,login,nome from public.profiles where id <> actor and left(lower(login),length(term))=term
       and not exists(select 1 from public.community_friends f where f.status='blocked' and least(f.requester,f.recipient)=least(actor,id) and greatest(f.requester,f.recipient)=greatest(actor,id)) order by login limit 20) p;
    return result;
  end if;
  if operation = 'friends' then
    select coalesce(jsonb_agg(to_jsonb(p)), '[]') into result from
      (select u.id,u.login,u.nome,f.status,(f.requester=actor) as outgoing,(f.blocker=actor) as blocked_by_me
       from public.community_friends f join public.profiles u on u.id=case when f.requester=actor then f.recipient else f.requester end
       where actor in (f.requester,f.recipient) and (f.status <> 'blocked' or f.blocker=actor)
       order by f.created_at desc limit 200) p;
    return result;
  end if;
  if operation in ('request','accept','remove','block','unblock','feed','send') then
    target := nullif(payload->>'target','')::uuid;
  end if;
  if operation in ('request','accept','remove','block','unblock') then
    if target is null or target=actor or not exists(select 1 from public.profiles where id=target) then raise exception 'Invalid user'; end if;
    perform pg_advisory_xact_lock(hashtextextended(least(actor,target)::text || greatest(actor,target)::text,0));
    select * into relation from public.community_friends where least(requester,recipient)=least(actor,target) and greatest(requester,recipient)=greatest(actor,target) for update;
    if operation='request' then
      if relation.status is not null then raise exception 'Relationship already exists'; end if;
      perform public.community_rate(actor,operation);
      insert into public.community_friends(requester,recipient) values(actor,target);
    elsif operation='accept' then
      if relation.status is distinct from 'pending' or relation.recipient <> actor then raise exception 'Recipient required'; end if;
      update public.community_friends set status='accepted' where requester=relation.requester and recipient=relation.recipient;
    elsif operation='block' then
      if relation.status='blocked' and relation.blocker<>actor then raise exception 'Relationship unavailable'; end if;
      if relation.status is null then insert into public.community_friends(requester,recipient,status,blocker) values(actor,target,'blocked',actor);
      else update public.community_friends set status='blocked',blocker=actor where requester=relation.requester and recipient=relation.recipient; end if;
    else
      if relation.status='blocked' and (operation <> 'unblock' or relation.blocker<>actor) then raise exception 'Block owner required'; end if;
      if operation='unblock' and relation.status is distinct from 'blocked' then raise exception 'No block'; end if;
      delete from public.community_friends where requester=relation.requester and recipient=relation.recipient;
    end if;
    return '{"ok":true}'::jsonb;
  end if;
  if operation in ('feed','send') then
    channel_name := coalesce(payload->>'channel','general');
    if channel_name not in ('general','suggestions','private') then raise exception 'Invalid channel'; end if;
    if channel_name='private' then
      if target is null or not exists(select 1 from public.community_friends where status='accepted' and least(requester,recipient)=least(actor,target) and greatest(requester,recipient)=greatest(actor,target)) then raise exception 'Accepted friendship required'; end if;
    else target := null; end if;
    if operation='feed' then
      before_id := coalesce(nullif(payload->>'before','')::bigint,9223372036854775807);
      select coalesce(jsonb_agg(to_jsonb(p) order by p.id::bigint), '[]') into result from
        (select m.id::text,m.sender,m.body,m.status,m.created_at,u.login,u.nome from public.community_messages m join public.profiles u on u.id=m.sender
         where m.channel=channel_name and m.id<before_id and (channel_name<>'private' or (m.sender=actor and m.recipient=target) or (m.sender=target and m.recipient=actor))
         and not exists(select 1 from public.community_friends f where f.status='blocked' and least(f.requester,f.recipient)=least(actor,m.sender) and greatest(f.requester,f.recipient)=greatest(actor,m.sender))
         order by m.id desc limit 50) p;
      return result;
    end if;
    content := trim(coalesce(payload->>'text',''));
    if length(content)<1 or length(content)>2000 then raise exception 'Write 1 to 2000 characters'; end if;
    perform public.community_rate(actor,operation);
    insert into public.community_messages(sender,recipient,channel,body) values(actor,target,channel_name,content) returning id into message_id;
    return jsonb_build_object('id',message_id::text);
  end if;
  if operation in ('delete','status') then
    message_id := (payload->>'id')::bigint;
    select * into message from public.community_messages where id=message_id;
    if message.id is null then raise exception 'Message not found'; end if;
    if operation='delete' then
      if message.sender<>actor and not (is_admin and message.channel<>'private') then raise exception 'Not allowed'; end if;
      delete from public.community_messages where id=message_id;
    else
      if not is_admin or message.channel<>'suggestions' or payload->>'status' not in ('open','planned','done') then raise exception 'Admin required'; end if;
      update public.community_messages set status=payload->>'status' where id=message_id;
    end if;
    return '{"ok":true}'::jsonb;
  end if;
  raise exception 'Unknown operation';
end;
$$;
revoke all on function public.community_action(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.community_action(uuid,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
