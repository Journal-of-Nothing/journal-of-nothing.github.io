-- Bootstrap schema for a fresh Supabase project
-- Combines all migrations and RLS policies in order.

-- 0001_init.sql
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

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_md text,
  author_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
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

-- 0002_review_opinion_replies.sql
-- Review opinion replies for multi-round discussion

create table if not exists public.review_opinion_replies (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  review_opinion_id uuid references public.review_opinions(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  role text check (role in ('author', 'reviewer')),
  body_md text not null,
  created_at timestamptz default now()
);

create or replace function public.ensure_reply_open()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.review_opinions ro
    where ro.id = new.review_opinion_id
      and ro.status = 'closed'
  ) then
    raise exception 'Review opinion is closed';
  end if;

  if exists (
    select 1 from public.review_opinions ro
    where ro.id = new.review_opinion_id
      and ro.submission_id <> new.submission_id
  ) then
    raise exception 'Submission mismatch for reply';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_reply_open on public.review_opinion_replies;
create trigger enforce_reply_open
before insert on public.review_opinion_replies
for each row
execute function public.ensure_reply_open();

-- 0003_users_username_unique.sql
-- Username uniqueness (case-insensitive)

alter table public.users
  add constraint users_username_not_empty
  check (username is null or length(trim(username)) > 0);

create unique index if not exists users_username_unique
  on public.users (lower(username))
  where username is not null;

-- 0004_submission_keywords_versions.sql
-- Add keywords and versioning for submissions

alter table public.submissions
  add column if not exists keywords text[] default '{}',
  add column if not exists version_major integer default 1,
  add column if not exists version_minor integer default 0,
  add column if not exists version_label text;

update public.submissions
set
  keywords = coalesce(keywords, '{}'),
  version_major = coalesce(version_major, 1),
  version_minor = coalesce(version_minor, 0),
  version_label = coalesce(version_label, to_char(now(), 'YYYYMMDD') || '_V1.0');

-- rls.sql

alter table public.users enable row level security;
alter table public.submissions enable row level security;
alter table public.review_slots enable row level security;
alter table public.comments enable row level security;
alter table public.review_opinions enable row level security;
alter table public.review_opinion_replies enable row level security;
alter table public.timeline_events enable row level security;
alter table public.stats_indexes enable row level security;
alter table public.announcements enable row level security;

create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = role_name
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.has_role('admin') or public.has_role('deputy_editor');
$$;

create policy "users_read_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_public_read"
  on public.users for select
  using (true);

create policy "users_admin_read"
  on public.users for select
  using (public.has_role('admin'));

create policy "users_admin_update"
  on public.users for update
  using (public.has_role('admin'));

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

create policy "submissions_read_own"
  on public.submissions for select
  using (auth.uid() = author_id);

create policy "submissions_public_read"
  on public.submissions for select
  using (status in ('accepted', 'in_review'));

create policy "submissions_write_own"
  on public.submissions for insert
  with check (auth.uid() = author_id);

create policy "submissions_update_own"
  on public.submissions for update
  using (auth.uid() = author_id);

create policy "submissions_staff_update"
  on public.submissions for update
  using (public.is_staff());

create policy "comments_public_read"
  on public.comments for select
  using (true);

create policy "comments_authenticated_write"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "comments_authenticated_update"
  on public.comments for update
  using (auth.uid() = author_id);

create policy "review_opinions_reviewer_write"
  on public.review_opinions for insert
  with check (
    auth.uid() = reviewer_id
    and not exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.author_id = reviewer_id
    )
  );

create policy "review_opinions_reviewer_read"
  on public.review_opinions for select
  using (auth.uid() = reviewer_id);

create policy "review_opinions_reviewer_update"
  on public.review_opinions for update
  using (auth.uid() = reviewer_id);

create policy "review_opinions_staff_read"
  on public.review_opinions for select
  using (public.is_staff());

create policy "review_opinions_staff_write"
  on public.review_opinions for update
  using (public.is_staff());

create policy "review_opinions_author_reply"
  on public.review_opinions for update
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.author_id = auth.uid()
    )
  );

create policy "review_opinions_public_read"
  on public.review_opinions for select
  using (true);

create policy "review_opinion_replies_public_read"
  on public.review_opinion_replies for select
  using (true);

create policy "review_opinion_replies_insert"
  on public.review_opinion_replies for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.review_opinions ro
      join public.submissions s on s.id = ro.submission_id
      where ro.id = review_opinion_id
        and ro.submission_id = submission_id
        and ro.status = 'open'
        and (ro.reviewer_id = auth.uid() or s.author_id = auth.uid())
    )
  );

create policy "review_slots_public_read"
  on public.review_slots for select
  using (true);

create policy "review_slots_reviewer_update"
  on public.review_slots for update
  using (
    auth.uid() = reviewer_id
    and not exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.author_id = reviewer_id
    )
  );

create policy "review_slots_reviewer_claim"
  on public.review_slots for update
  using (
    reviewer_id is null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.can_review = true
    )
    and not exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.author_id = auth.uid()
    )
  );

create policy "review_slots_staff_write"
  on public.review_slots for update
  using (public.is_staff());

create policy "announcements_public_read"
  on public.announcements for select
  using (true);

create policy "announcements_admin_insert"
  on public.announcements for insert
  with check (public.has_role('admin'));

create policy "announcements_admin_update"
  on public.announcements for update
  using (public.has_role('admin'));

create policy "announcements_admin_delete"
  on public.announcements for delete
  using (public.has_role('admin'));
