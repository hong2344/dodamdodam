-- The app identifies users by nickname, so nicknames must be present and unique.
-- Existing blank nicknames are backfilled, and duplicate existing nicknames are made unique
-- before the constraints are applied.
update public.profiles
set nickname = 'user_' || left(id::text, 8)
where nickname is null or btrim(nickname) = '';

update public.profiles
set nickname = left(regexp_replace(btrim(nickname), '\s+', '', 'g'), 12)
where char_length(regexp_replace(btrim(nickname), '\s+', '', 'g')) > 12
   or nickname <> regexp_replace(btrim(nickname), '\s+', '', 'g');

update public.profiles
set nickname = 'user_' || left(id::text, 8)
where char_length(btrim(nickname)) < 2;

with duplicated as (
  select
    id,
    row_number() over (partition by lower(btrim(nickname)) order by created_at nulls last, id) as duplicate_order
  from public.profiles
)
update public.profiles p
set nickname = left(btrim(p.nickname), 7) || '_' || left(p.id::text, 4)
from duplicated d
where p.id = d.id
  and d.duplicate_order > 1;

alter table public.profiles
  alter column nickname set not null;

alter table public.profiles
  drop constraint if exists profiles_nickname_not_blank,
  add constraint profiles_nickname_not_blank check (char_length(btrim(nickname)) between 2 and 12);

create unique index if not exists profiles_nickname_unique_idx
  on public.profiles (lower(btrim(nickname)));
