
alter table public.users enable row level security;
alter table public.submissions enable row level security;
alter table public.review_slots enable row level security;
alter table public.comments enable row level security;
alter table public.review_opinions enable row level security;
alter table public.review_opinion_replies enable row level security;
alter table public.timeline_events enable row level security;
alter table public.stats_indexes enable row level security;

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
