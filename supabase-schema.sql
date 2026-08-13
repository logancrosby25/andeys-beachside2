-- Andey's Beachside final Supabase schema
create extension if not exists btree_gist;
create table if not exists public.admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.bookings(
 id uuid primary key default gen_random_uuid(), code text unique not null, service text not null, booking_date date not null,
 start_minute integer not null check(start_minute between 0 and 1439), end_minute integer not null check(end_minute>start_minute and end_minute<=1440),
 duration_label text not null,parent_name text not null,phone text not null,email text not null,children_count integer not null default 1,ages text not null,location text not null,
 experience text,special_notes text,emergency_contact text,status text not null default 'Requested' check(status in('Requested','Confirmed','Cancelled')),
 payment_status text not null default 'Unpaid',payment_choice text,amount_total numeric(10,2) not null default 0,amount_paid numeric(10,2) not null default 0,
 stripe_checkout_session_id text,policy_accepted boolean not null default false,created_at timestamptz not null default now(),slot int4range generated always as(int4range(start_minute,end_minute,'[)')) stored);
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist(booking_date with =,slot with &&) where(status in('Requested','Confirmed'));
create table if not exists public.blocked_times(id uuid primary key default gen_random_uuid(),block_date date not null,start_minute integer not null,end_minute integer not null check(end_minute>start_minute),note text,created_at timestamptz not null default now());
alter table public.admins enable row level security;alter table public.bookings enable row level security;alter table public.blocked_times enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.admins where user_id=auth.uid());$$;
revoke all on function public.is_admin() from public;grant execute on function public.is_admin() to authenticated,anon;
drop policy if exists "public insert booking" on public.bookings;create policy "public insert booking" on public.bookings for insert to anon,authenticated with check(status='Requested');
drop policy if exists "admin manage booking" on public.bookings;create policy "admin manage booking" on public.bookings for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin self" on public.admins;create policy "admin self" on public.admins for select to authenticated using(user_id=auth.uid());
drop policy if exists "admin blocks" on public.blocked_times;create policy "admin blocks" on public.blocked_times for all to authenticated using(public.is_admin()) with check(public.is_admin());
create or replace function public.get_busy_ranges(p_date date) returns table(start_minute integer,end_minute integer) language sql stable security definer set search_path=public as $$select start_minute,end_minute from public.bookings where booking_date=p_date and status in('Requested','Confirmed') union all select start_minute,end_minute from public.blocked_times where block_date=p_date;$$;
revoke all on function public.get_busy_ranges(date) from public;grant execute on function public.get_busy_ranges(date) to anon,authenticated;
-- Customer lookup exposes one matching booking only when code AND email match.
create or replace function public.lookup_booking(p_code text,p_email text) returns setof public.bookings language sql stable security definer set search_path=public as $$select * from public.bookings where lower(code)=lower(p_code) and lower(email)=lower(p_email) limit 1;$$;
revoke all on function public.lookup_booking(text,text) from public;grant execute on function public.lookup_booking(text,text) to anon,authenticated;
create or replace function public.customer_cancel_booking(p_code text,p_email text) returns public.bookings language plpgsql security definer set search_path=public as $$declare r public.bookings;begin update public.bookings set status='Cancelled' where lower(code)=lower(p_code) and lower(email)=lower(p_email) and status<>'Cancelled' returning * into r;return r;end$$;
revoke all on function public.customer_cancel_booking(text,text) from public;grant execute on function public.customer_cancel_booking(text,text) to anon,authenticated;
create or replace function public.customer_reschedule_booking(p_code text,p_email text,p_date date,p_start integer,p_end integer,p_duration text) returns public.bookings language plpgsql security definer set search_path=public as $$declare r public.bookings;begin update public.bookings set booking_date=p_date,start_minute=p_start,end_minute=p_end,duration_label=p_duration,status='Requested' where lower(code)=lower(p_code) and lower(email)=lower(p_email) returning * into r;return r;end$$;
revoke all on function public.customer_reschedule_booking(text,text,date,integer,integer,text) from public;grant execute on function public.customer_reschedule_booking(text,text,date,integer,integer,text) to anon,authenticated;
-- After creating the admin Auth user, run: insert into public.admins(user_id) values ('ADMIN-UUID');
