-- interest_categories는 참조용 읽기 전용 데이터.
-- RLS를 켜고 '읽기만' 허용한다 (쓰기 정책 없음 → 클라이언트가 수정/삭제 불가).
-- (이전엔 RLS 비활성이라 anon 키로 누구나 수정 가능한 보안 경고 상태였음.)
alter table public.interest_categories enable row level security;

drop policy if exists "Anyone can read interest_categories" on public.interest_categories;
create policy "Anyone can read interest_categories"
  on public.interest_categories
  for select
  to anon, authenticated
  using (true);
