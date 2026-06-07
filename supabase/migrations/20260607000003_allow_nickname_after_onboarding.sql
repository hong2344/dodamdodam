-- Nickname is the final onboarding step, so profile rows can exist before a nickname is chosen.
alter table public.profiles
  alter column nickname drop not null;
