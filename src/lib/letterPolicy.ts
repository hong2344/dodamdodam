export type LetterPolicyViolation = 'profanity' | 'phone' | 'openKakao' | 'contact'

// 욕설/비속어·인신공격을 차단한다.
// 단, 고민/감정 편지에 흔한 표현은 오탐 방지를 위해 일부러 제외한다:
//  - '죽어/죽고싶어', '꺼져', '미치겠어' 같은 감정 표현은 막지 않는다.
//  - '개새'는 '새벽'을 오탐하므로 제외('개새끼'는 '새끼' 패턴이 그대로 잡는다).
//  - '보지/자지'는 '보지 마/자지 마'(하지 말라는 뜻)를 오탐하므로 제외.
//  - '미친'은 단독이면 감정 표현('미치겠어')이라 제외하고, '미친놈/미친년'만 인신공격으로 본다.
const PROFANITY_PATTERNS = [
  /시\s*발/i,
  /씨\s*발/i,
  /ㅅ\s*ㅂ/i,
  /병\s*신/i,
  /ㅂ\s*ㅅ/i,
  /지\s*랄/i,
  /새\s*끼/i,
  /좆/i,
  /좇/i,
  /존\s*나/i,
  /존\s*내/i,
  /ㅈ\s*ㄴ/i,
  /썅/i,
  /엿\s*먹/i,
  /닥\s*쳐/i,
  /느\s*금/i, // 느금마
  /니\s*(애|에)\s*미/i, // 니애미 (패드립)
  /미\s*친\s*(놈|년)/i,
  /개\s*(같|년|놈|쓰레기)/i, // '개새'는 '개새벽' 오탐으로 제외(개새끼는 '새끼'가 잡음)
  /창\s*녀/i,
  /fuck/i,
  /shit/i,
  /bitch/i,
  /asshole/i,
  /motherf/i,
  /\bcunt\b/i,
  /retard/i,
]

const PHONE_PATTERNS = [
  /(?:\+?82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/,
  /\b\d{2,3}[-.\s]\d{3,4}[-.\s]\d{4}\b/,
]

const OPEN_KAKAO_PATTERNS = [
  /open\.kakao\.com/i,
  /오픈\s*카\s*톡/i,
  /오픈\s*카카오/i,
  /오픈\s*채팅/i,
  /카카오\s*톡/i,
  /카\s*톡/i,
  /kakao\s*talk/i,
  /\bkakaotalk\b/i,
]

// 플랫폼 밖 연락처(타 SNS·메신저·이메일) 교환 차단.
// 미성년자 안전상 카카오 외 경로로 빠지는 것도 막는다. 카카오는 위 OPEN_KAKAO에서 별도 처리.
// 'line(라인)'은 'online/in line/라인이 예쁘다' 등 오탐이 커서 제외했다.
const CONTACT_PATTERNS = [
  /인\s*스\s*타/i,
  /인\s*별/i, // 인스타 은어
  /insta(gram)?/i,
  /디\s*스\s*코\s*드/i,
  /디\s*코/i, // 디스코드 은어
  /discord/i,
  /텔\s*레\s*그\s*램/i,
  /telegram/i,
  /스\s*냅\s*챗/i,
  /snap\s*chat/i,
  /왓\s*츠\s*앱/i,
  /whats\s*app/i,
  /페\s*메/i, // 페이스북 메신저
  /트\s*위\s*터/i,
  /twitter/i,
  /facebook/i,
  // 이메일 주소
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
]

export function getLetterPolicyViolation(text: string): LetterPolicyViolation | null {
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(text))) return 'profanity'
  if (PHONE_PATTERNS.some((pattern) => pattern.test(text))) return 'phone'
  if (OPEN_KAKAO_PATTERNS.some((pattern) => pattern.test(text))) return 'openKakao'
  if (CONTACT_PATTERNS.some((pattern) => pattern.test(text))) return 'contact'
  return null
}

export function getLetterPolicyMessage(violation: LetterPolicyViolation) {
  switch (violation) {
    case 'profanity':
      return '욕설은 편지에 사용할 수 없어요.'
    case 'phone':
      return '전화번호 교환은 편지에서 할 수 없어요.'
    case 'openKakao':
      return '오픈카카오채팅 교환은 편지에서 할 수 없어요.'
    case 'contact':
      return '다른 SNS·메신저·이메일 등 연락처 교환은 편지에서 할 수 없어요.'
  }
}
