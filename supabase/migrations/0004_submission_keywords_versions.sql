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
