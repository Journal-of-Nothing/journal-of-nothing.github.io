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
