-- 매칭이 어떤 고민(관심사) 카테고리로 성사됐는지 matches에 스냅샷으로 저장한다.
-- 목적: 홈/카테고리 화면에서 '이번 주 고민(= 진행 중인 매칭의 카테고리)'과
--       '다음 주 고민(= profiles.match_category, 사용자가 일 20-24시에 바꾸는 값)'을 구분해 보여주기 위함.
-- profiles.match_category 는 변경 시 덮어써지므로 '이번 주에 실제로 매칭된 카테고리'를 따로 보존해야 한다.

alter table public.matches
  add column if not exists category text references public.interest_categories(id);

-- 기존 active 매칭은 user_a 의 현재 선호로 best-effort 백필(둘은 매칭 당시 같은 카테고리였다).
update public.matches m
  set category = p.match_category
  from public.profiles p
  where p.id = m.user_a_id and m.category is null;

-- match_pool: 페어링 시 카테고리(a.cat)를 matches.category 로 함께 기록한다.
CREATE OR REPLACE FUNCTION public.match_pool(p_candidates uuid[], p_week_start date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_end date := p_week_start + 6;
  v_used uuid[] := '{}';
  v_count int := 0;
  r record;
begin
  for r in
    with cand as (
      select p.id, p.match_category as cat, p.age
      from profiles p
      where p.id = any(p_candidates)
        and p.match_category is not null
        and p.age is not null
    ),
    pairs as (
      select a.id as ua, b.id as ub, a.cat as cat, abs(a.age - b.age) as agediff
      from cand a
      join cand b on a.cat = b.cat and a.id < b.id
      where not exists (
        select 1 from match_history h
        where (h.user_a_id = a.id and h.user_b_id = b.id)
           or (h.user_a_id = b.id and h.user_b_id = a.id)
      )
    )
    select ua, ub, cat from pairs
    order by agediff asc, ua, ub
  loop
    if r.ua = any(v_used) or r.ub = any(v_used) then
      continue;
    end if;
    insert into matches (user_a_id, user_b_id, week_start, week_end, status, category)
    values (r.ua, r.ub, p_week_start, v_week_end, 'active', r.cat);
    insert into match_history (user_a_id, user_b_id, last_matched)
    values (r.ua, r.ub, current_date)
    on conflict (user_a_id, user_b_id) do update set last_matched = excluded.last_matched;
    v_used := v_used || r.ua || r.ub;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;

revoke execute on function public.match_pool(uuid[], date) from public;
grant execute on function public.match_pool(uuid[], date) to service_role;
