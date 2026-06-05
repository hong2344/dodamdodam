// 한국시간(KST, UTC+9) 기준 이번 ISO 주의 월요일을 'YYYY-MM-DD'로 반환한다.
//
// 매칭 크론은 한국시간 월요일 0~1시(= 일요일 15~16시 UTC)에 도는데, 그 시점의
// KST 벽시계 날짜로 week_start를 고정해 DB 함수에 명시적으로 넘긴다.
// (DB 세션 타임존은 UTC라, week_start를 넘기지 않으면 UTC 날짜 기준으로 계산되어
//  의도한 월요일과 어긋날 수 있다.)
export function kstWeekStart(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  // getUTCDay(): 0=일 ... 6=토. ISO 주는 월요일 시작이므로 월=0 ... 일=6로 변환.
  const isoOffset = (kst.getUTCDay() + 6) % 7
  kst.setUTCDate(kst.getUTCDate() - isoOffset)
  return kst.toISOString().slice(0, 10)
}
