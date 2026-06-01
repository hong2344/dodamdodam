-- 매칭 시스템 DB 함수
-- 공유 Supabase 프로젝트(zaoniaczzfbstxiuiifa)에 적용됨. 2026-06-01.
-- 페어링 로직(match_pool) + 주간 배치(run_weekly_matching) + 매칭 알림(send_match_notifications).
-- matches 테이블에 INSERT용 RLS 정책이 없으므로 SECURITY DEFINER로 실행하고,
-- 실행 권한은 service_role 에게만 부여한다(서버 전용 크론/라우트에서 호출).

-- 같은 관심사(match_category) 안에서 나이차 오름차순 그리디 페어링.
-- 한 번이라도 매칭된 적 있는 쌍(match_history)은 영구 제외.
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
      select a.id as ua, b.id as ub, abs(a.age - b.age) as agediff
      from cand a
      join cand b on a.cat = b.cat and a.id < b.id
      where not exists (
        select 1 from match_history h
        where (h.user_a_id = a.id and h.user_b_id = b.id)
           or (h.user_a_id = b.id and h.user_b_id = a.id)
      )
    )
    select ua, ub from pairs
    order by agediff asc, ua, ub
  loop
    if r.ua = any(v_used) or r.ub = any(v_used) then
      continue;
    end if;
    insert into matches (user_a_id, user_b_id, week_start, week_end, status)
    values (r.ua, r.ub, p_week_start, v_week_end, 'active');
    insert into match_history (user_a_id, user_b_id, last_matched)
    values (r.ua, r.ub, current_date)
    on conflict (user_a_id, user_b_id) do update set last_matched = excluded.last_matched;
    v_used := v_used || r.ua || r.ub;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;

-- 주간 배치: eligible(온보딩 완료 + 진행 중 매칭 없음) 산출 후 match_pool 위임.
CREATE OR REPLACE FUNCTION public.run_weekly_matching(p_week_start date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_start date := coalesce(p_week_start, date_trunc('week', current_date)::date);
  v_cands uuid[];
begin
  select array_agg(p.id) into v_cands
  from profiles p
  where p.village_id is not null
    and p.match_category is not null
    and p.age is not null
    and not exists (
      select 1 from matches m
      where m.status = 'active' and (m.user_a_id = p.id or m.user_b_id = p.id)
    );
  if v_cands is null then
    return 0;
  end if;
  return match_pool(v_cands, v_week_start);
end;
$function$;

-- 매칭 완료 알림: 이번 주 active 매칭에 속한 사용자 중 아직 new_match 알림이 없는 사람에게 생성.
CREATE OR REPLACE FUNCTION public.send_match_notifications(p_week_start date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_start date := coalesce(p_week_start, date_trunc('week', current_date)::date);
  v_count int := 0;
  r record;
begin
  for r in
    select uid from (
      select user_a_id as uid from matches where status = 'active' and week_start = v_week_start
      union
      select user_b_id as uid from matches where status = 'active' and week_start = v_week_start
    ) s
    where not exists (
      select 1 from notifications n
      where n.user_id = s.uid
        and n.type = 'new_match'
        and n.created_at::date >= v_week_start
    )
  loop
    insert into notifications (user_id, type, payload)
    values (r.uid, 'new_match',
      jsonb_build_object('message', '매칭이 완료되었습니다. 누구와 매칭이 되었을까요? 얼른 확인해보세요~'));
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

-- 익명/일반 사용자에게는 실행 권한을 주지 않는다 (RLS 우회 방지).
revoke execute on function public.match_pool(uuid[], date) from public;
revoke execute on function public.run_weekly_matching(date) from public;
revoke execute on function public.send_match_notifications(date) from public;
grant execute on function public.match_pool(uuid[], date) to service_role;
grant execute on function public.run_weekly_matching(date) to service_role;
grant execute on function public.send_match_notifications(date) to service_role;
