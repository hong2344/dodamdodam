-- 매칭 자동 회귀 테스트
-- 통제 시나리오(성적 14/15/16/16/18 + 연애 16)를 심고 match_pool을 돌린 뒤
-- "동갑 우선 / 나이 근접 / 카테고리 격리"를 검증하고, 서브트랜잭션을 롤백해 DB를 전혀 오염시키지 않는다.
-- 사용법:  select * from public.test_matching_regression();
-- 매칭 로직 수정 후 이 한 줄로 회귀를 확인할 수 있다. 운영 DB에서도 안전(롤백).
CREATE OR REPLACE FUNCTION public.test_matching_regression()
 RETURNS TABLE(check_name text, passed boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  id14  uuid := '0a000000-0000-4000-8000-000000000014';
  id15  uuid := '0a000000-0000-4000-8000-000000000015';
  id16a uuid := '0a000000-0000-4000-8000-00000000016a';
  id16b uuid := '0a000000-0000-4000-8000-00000000016b';
  id18  uuid := '0a000000-0000-4000-8000-000000000018';
  idr16 uuid := '0a000000-0000-4000-8000-0000000000a6';
  v_ws date := date_trunc('week', current_date)::date;
  p16 boolean := false; p1415 boolean := false; p18 boolean := false; pr16 boolean := false;
  v_pairs int := 0;
  v_err text := null;
begin
  begin  -- 서브트랜잭션 (끝에 강제 롤백)
    insert into profiles (id, nickname, age, match_category, created_at) values
      (id14, 'reg_t14', 14, 'grades', now()),
      (id15, 'reg_t15', 15, 'grades', now()),
      (id16a,'reg_t16a',16, 'grades', now()),
      (id16b,'reg_t16b',16, 'grades', now()),
      (id18, 'reg_t18', 18, 'grades', now()),
      (idr16,'reg_tr16',16, 'romance', now());

    v_pairs := match_pool(array[id14,id15,id16a,id16b,id18,idr16], v_ws);

    p16 := exists (select 1 from matches m where m.status='active' and m.week_start=v_ws
                   and ((m.user_a_id=id16a and m.user_b_id=id16b) or (m.user_a_id=id16b and m.user_b_id=id16a)));
    p1415 := exists (select 1 from matches m where m.status='active' and m.week_start=v_ws
                   and ((m.user_a_id=id14 and m.user_b_id=id15) or (m.user_a_id=id15 and m.user_b_id=id14)));
    p18 := not exists (select 1 from matches m where m.status='active'
                   and (m.user_a_id=id18 or m.user_b_id=id18));
    pr16 := not exists (select 1 from matches m where m.status='active'
                   and (m.user_a_id=idr16 or m.user_b_id=idr16));

    raise exception 'REGRESSION_TEST_ROLLBACK';
  exception when others then
    if sqlerrm not like '%REGRESSION_TEST_ROLLBACK%' then
      v_err := sqlerrm;  -- 예기치 못한 에러 = 회귀
    end if;
  end;

  return query select * from (values
    ('동갑 1순위: 16 ↔ 16 매칭',           p16,   '성적 16a-16b가 한 쌍 (나이차 0)'),
    ('차순위: 14 ↔ 15 매칭',               p1415, '남은 인원 중 가장 가까운 14-15 (나이차 1)'),
    ('나이 후순위: 18세 미매칭',            p18,   '가까운 상대 모두 소진되어 18세 단독'),
    ('카테고리 격리: romance 16세 미매칭',  pr16,  '성적 16세들과 동갑이어도 카테고리 달라 매칭 안 됨'),
    ('=== 전체 통과 ===',                   (p16 and p1415 and p18 and pr16 and v_err is null),
                                            coalesce('오류: '||v_err, 'pairs='||v_pairs||' (기대값 2)'))
  ) as t(check_name, passed, detail);
end;
$function$;

revoke execute on function public.test_matching_regression() from public;
grant execute on function public.test_matching_regression() to service_role;
