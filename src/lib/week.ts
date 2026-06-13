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

// PRD 매칭 신청 접수 시간: 한국시간(KST) 매주 일요일 20:00 ~ 24:00.
// 이 시간에만 매칭 신청(관심사 저장)이 가능하다.
export function isApplicationWindowOpen(now: Date = new Date()): boolean {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay() // 0=일
  const hour = kst.getUTCHours()
  return day === 0 && hour >= 20 && hour < 24
}

// 신청 불가 안내용 문구.
export const APPLICATION_WINDOW_MESSAGE =
  '매칭 신청은 매주 일요일 저녁 8시~자정에만 가능해요.'

// 현재 신청창이 열려 있다면 그 창이 닫히는 시각(= KST 월요일 00:00)을 반환한다.
// 창이 열려 있지 않으면 null (마감 카운트다운은 실제 창이 열렸을 때만 보여준다).
export function applicationWindowEnd(now: Date = new Date()): Date | null {
  if (!isApplicationWindowOpen(now)) return null
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCHours(24, 0, 0, 0) // 다음 0시(KST 월요일 00:00)로 이동
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}
