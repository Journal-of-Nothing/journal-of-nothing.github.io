-- Username uniqueness (case-insensitive)

alter table public.users
  add constraint users_username_not_empty
  check (username is null or length(trim(username)) > 0);

create unique index if not exists users_username_unique
  on public.users (lower(username))
  where username is not null;
