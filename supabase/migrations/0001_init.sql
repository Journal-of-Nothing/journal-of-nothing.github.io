-- Core tables for journal-supabase

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  github_id text unique,
  username text,
  avatar_url text,
  role text default 'author' check (role in ('author', 'reviewer', 'deputy_editor', 'admin')),
  can_submit boolean default true,
  can_review boolean default true,
  can_comment boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  abstract text,
  content_md text,
  status text default 'submitted',
  decision text check (decision in ('accept', 'minor', 'major', 'reject')),
  author_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  accepted_at timestamptz,
  rejected_at timestamptz
);

create table if not exists public.review_slots (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  status text default 'open',
  claimed_at timestamptz,
  due_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  body_md text,
  created_at timestamptz default now()
);

create table if not exists public.review_opinions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  body_md text,
  decision text check (decision in ('accept', 'minor', 'major', 'reject')),
  status text default 'open' check (status in ('open', 'closed')),
  author_reply_md text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  type text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.stats_indexes (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  value jsonb,
  updated_at timestamptz default now()
);

-- Allow only one active submission per author (submitted/in_review)
create or replace function public.check_author_active_submission()
returns trigger
language plpgsql
as $$
begin
  if (new.status in ('submitted', 'in_review')) then
    if (
      select count(*) from public.submissions
      where author_id = new.author_id
        and status in ('submitted', 'in_review')
        and id <> new.id
    ) >= 1 then
      raise exception 'Author already has an active submission';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_author_active_submission on public.submissions;
create trigger enforce_author_active_submission
before insert or update of status on public.submissions
for each row
execute function public.check_author_active_submission();

-- Limit open review opinions to 3 per submission
create or replace function public.check_open_review_limit()
returns trigger
language plpgsql
as $$
begin
  if (new.status = 'open') then
    if (
      select count(*) from public.review_opinions
      where submission_id = new.submission_id and status = 'open'
    ) >= 3 then
      raise exception 'Open review opinions limit reached for this submission';
    end if;
  end if;

  return new;
end;
$$;

-- Prevent reviewing own submission
create or replace function public.prevent_self_review()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.submissions s
    where s.id = new.submission_id and s.author_id = new.reviewer_id
  ) then
    raise exception 'Reviewer cannot review own submission';
  end if;

  return new;
end;
$$;

-- Prevent claiming review slot for own submission
create or replace function public.prevent_self_review_slot()
returns trigger
language plpgsql
as $$
begin
  if new.reviewer_id is not null then
    if exists (
      select 1 from public.submissions s
      where s.id = new.submission_id and s.author_id = new.reviewer_id
    ) then
      raise exception 'Reviewer cannot claim slot for own submission';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_open_review_limit on public.review_opinions;
create trigger enforce_open_review_limit
before insert or update of status on public.review_opinions
for each row
execute function public.check_open_review_limit();

drop trigger if exists enforce_prevent_self_review on public.review_opinions;
create trigger enforce_prevent_self_review
before insert or update of reviewer_id on public.review_opinions
for each row
execute function public.prevent_self_review();

drop trigger if exists enforce_prevent_self_review_slot on public.review_slots;
create trigger enforce_prevent_self_review_slot
before insert or update of reviewer_id on public.review_slots
for each row
execute function public.prevent_self_review_slot();
