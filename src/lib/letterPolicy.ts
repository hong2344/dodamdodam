export type LetterPolicyViolation = 'profanity' | 'phone' | 'email' | 'name' | 'school' | 'openKakao' | 'contact'

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
  /(?:\+?82[-.\s]?)?0\s*1\s*[016789](?:[-.\s]?\d){7,8}/,
]

const EMAIL_PATTERNS = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /[a-z0-9._%+-]+\s*(?:골뱅이|앳|at)\s*[a-z0-9.-]+\s*(?:닷|점|dot)\s*[a-z]{2,}/i,
  /\b[a-z0-9._%+-]+\s*(?:naver|gmail|googlemail|daum|hanmail|kakao|icloud|outlook|hotmail)\s*(?:com|net|co\.kr)?\b/i,
  /(?:네이버|지메일|구글메일|다음|한메일|카카오|아이클라우드|아웃룩|핫메일)\s*(?:메일|email|e-mail)?/i,
]

const NAME_PATTERNS = [
  /(?:내\s*)?(?:이름|실명|본명|성명)\s*(?:은|는|이|가|:|=)/i,
  /(?:나는|저는|제가|난|전)\s*[가-힣]{2,4}\s*(?:이야|야|입니다|이에요|예요|라고|이라고)/,
  /[가-힣]{2,4}\s*(?:이라고|라고)\s*(?:불러|해|합니다|부르면)/,
  /(?:my\s*)?name\s*(?:is|:|=)/i,
]

const SCHOOL_PATTERNS = [
  /학교/,
  /초등\s*학교/,
  /중\s*학교/,
  /고등\s*학교/,
  /대학교/,
  /대학/,
  /캠퍼스/,
  /[가-힣a-z0-9]+\s*(?:초|중|고|대)\s*(?:다녀|다니|나왔|졸업|학생|재학)/i,
  /[가-힣a-z0-9]+\s*(?:초등학교|중학교|고등학교|대학교|대학)\s*(?:다녀|다니|나왔|졸업|학생|재학)?/i,
  /\b(?:school|university|college|campus)\b/i,
]

const OPEN_KAKAO_PATTERNS = [
  /open\.kakao\.com/i,
  /open\s*kakao/i,
  /오픈\s*카\s*톡/i,
  /오픈\s*톡/i,
  /오픈\s*카카오/i,
  /오픈\s*채팅/i,
  /오픈\s*챗/i,
  /옾\s*챗/i,
  /오\s*카/i,
  /카카오\s*톡/i,
  /카\s*톡/i,
  /카카오\s*(?:아이디|id)/i,
  /카\s*톡\s*(?:아이디|id)/i,
  /카톡방/i,
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
]

function hasPhoneNumber(text: string) {
  const digitsOnly = text.replace(/\D/g, '')
  return PHONE_PATTERNS.some((pattern) => pattern.test(text)) ||
    /(?:82)?01[016789]\d{7,8}/.test(digitsOnly)
}

export function getLetterPolicyViolation(text: string): LetterPolicyViolation | null {
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(text))) return 'profanity'
  if (hasPhoneNumber(text)) return 'phone'
  if (EMAIL_PATTERNS.some((pattern) => pattern.test(text))) return 'email'
  if (NAME_PATTERNS.some((pattern) => pattern.test(text))) return 'name'
  if (SCHOOL_PATTERNS.some((pattern) => pattern.test(text))) return 'school'
  if (OPEN_KAKAO_PATTERNS.some((pattern) => pattern.test(text))) return 'openKakao'
  if (CONTACT_PATTERNS.some((pattern) => pattern.test(text))) return 'contact'
  return null
}

export function getLetterPolicyMessage(violation: LetterPolicyViolation) {
  switch (violation) {
    case 'profanity':
      return '욕설은 편지에 쓸 수 없습니다.'
    case 'phone':
      return '전화번호는 편지에 쓸 수 없습니다.'
    case 'email':
      return '이메일은 편지에 쓸 수 없습니다.'
    case 'name':
      return '이름은 편지에 쓸 수 없습니다.'
    case 'school':
      return '학교는 편지에 쓸 수 없습니다.'
    case 'openKakao':
      return '오픈 카카오는 편지에 쓸 수 없습니다.'
    case 'contact':
      return '다른 SNS·메신저 연락처는 편지에 쓸 수 없습니다.'
  }
}
