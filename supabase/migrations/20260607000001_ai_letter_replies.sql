-- AI replies are stored in the same letters table so they appear in the normal mailbox.
-- User-to-AI letters may not have a human receiver, and AI-to-user replies do not have
-- a real auth user sender.
alter table public.letters
  alter column match_id drop not null,
  alter column sender_id drop not null,
  alter column receiver_id drop not null;

alter table public.letters
  add column if not exists sender_type text not null default 'user',
  add column if not exists receiver_type text not null default 'user',
  add column if not exists sender_display_name text,
  add column if not exists receiver_display_name text,
  add column if not exists original_letter_id uuid references public.letters(id) on delete set null;

alter table public.letters
  drop constraint if exists letters_sender_type_check,
  add constraint letters_sender_type_check check (sender_type in ('user', 'ai'));

alter table public.letters
  drop constraint if exists letters_receiver_type_check,
  add constraint letters_receiver_type_check check (receiver_type in ('user', 'ai'));

create index if not exists letters_original_letter_id_idx
  on public.letters(original_letter_id);
