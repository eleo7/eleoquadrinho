-- Execute inteiro no SQL Editor. Somente metadados e sinalização; nunca arquivos HQ.
begin;
create table if not exists public.hq_offers(id uuid primary key default gen_random_uuid(),owner uuid not null references public.profiles(id) on delete cascade,title text not null,cover text not null default '',items jsonb not null,created_at timestamptz not null default now());
create table if not exists public.hq_requests(id uuid primary key default gen_random_uuid(),offer_id uuid not null references public.hq_offers(id) on delete cascade,reader uuid not null references public.profiles(id) on delete cascade,status text not null default 'pending' check(status in ('pending','accepted','declined','completed')),sender_signal jsonb,reader_signal jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists hq_request_active on public.hq_requests(offer_id,reader) where status in ('pending','accepted');
alter table public.hq_offers enable row level security;alter table public.hq_requests enable row level security;
revoke all on public.hq_offers,public.hq_requests from public,anon,authenticated;
create or replace function public.hq_transfer(actor uuid,operation text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare admin boolean; o public.hq_offers; r public.hq_requests; result jsonb;
begin
 select role='admin' into admin from public.profiles where id=actor;if admin is null then raise exception 'Account required';end if;
 if operation='offers' then select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from(select * from public.hq_offers order by created_at desc limit 200)x;return result;end if;
 if operation='publish' then
  if not admin then raise exception 'Admin required';end if;
  if (select count(*) from public.hq_offers where owner=actor)>=200 then raise exception 'Offer limit';end if;
  insert into public.hq_offers(owner,title,cover,items)values(actor,payload->>'title',coalesce(payload->>'cover',''),payload->'items')returning * into o;return to_jsonb(o);
 end if;
 if operation='request' then
  select * into o from public.hq_offers where id=(payload->>'offer')::uuid;if o.id is null or o.owner=actor then raise exception 'Invalid offer';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if (select count(*) from public.hq_requests where reader=actor and status in ('pending','accepted'))>=30 then raise exception 'Request limit';end if;
  insert into public.hq_requests(offer_id,reader)values(o.id,actor) on conflict do nothing;return '{"ok":true}';
 end if;
 if operation='list' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from(select t.id,t.offer_id,t.reader,t.status,t.updated_at,f.owner,f.title,f.items,p.nome,p.login from public.hq_requests t join public.hq_offers f on f.id=t.offer_id join public.profiles p on p.id=t.reader where t.reader=actor or f.owner=actor order by (t.status in ('pending','accepted')) desc,t.created_at desc limit 100)x;return result;
 end if;
 select * into r from public.hq_requests where id=(payload->>'id')::uuid for update;
 select * into o from public.hq_offers where id=r.offer_id;
 if r.id is null or actor not in (r.reader,o.owner) then raise exception 'Not allowed';end if;
 if operation='accept' or operation='decline' then
  if not admin or actor<>o.owner or r.status not in ('pending','accepted') then raise exception 'Not allowed';end if;
  update public.hq_requests set status=case when operation='accept' then 'accepted' else 'declined' end,sender_signal=null,reader_signal=null,updated_at=now() where id=r.id;return '{"ok":true}';
 end if;
 if operation='signal' then
  if r.status<>'accepted' or r.updated_at<now()-interval '2 hours' then raise exception 'Session expired';end if;
  if payload ? 'signal' then
   if actor=o.owner and admin then update public.hq_requests set sender_signal=payload->'signal' where id=r.id;
   elsif actor=r.reader then update public.hq_requests set reader_signal=payload->'signal' where id=r.id;
   else raise exception 'Not allowed';end if;
  end if;
  select * into r from public.hq_requests where id=r.id;
  return jsonb_build_object('signal',case when actor=o.owner then r.reader_signal else r.sender_signal end);
 end if;
 if operation='complete' and actor=r.reader and r.status='accepted' then update public.hq_requests set status='completed',sender_signal=null,reader_signal=null,updated_at=now() where id=r.id;return '{"ok":true}';end if;
 raise exception 'Invalid operation';
end;$$;
revoke all on function public.hq_transfer(uuid,text,jsonb) from public,anon,authenticated;grant execute on function public.hq_transfer(uuid,text,jsonb) to service_role;
notify pgrst,'reload schema';commit;
