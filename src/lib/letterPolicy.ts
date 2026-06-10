export type LetterPolicyViolation = 'profanity' | 'phone' | 'openKakao'

const PROFANITY_PATTERNS = [
  /시\s*발/i,
  /씨\s*발/i,
  /ㅅ\s*ㅂ/i,
  /병\s*신/i,
  /ㅂ\s*ㅅ/i,
  /지\s*랄/i,
  /개\s*새/i,
  /새\s*끼/i,
  /꺼\s*져/i,
  /죽\s*어/i,
  /fuck/i,
  /shit/i,
  /bitch/i,
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

export function getLetterPolicyViolation(text: string): LetterPolicyViolation | null {
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(text))) return 'profanity'
  if (PHONE_PATTERNS.some((pattern) => pattern.test(text))) return 'phone'
  if (OPEN_KAKAO_PATTERNS.some((pattern) => pattern.test(text))) return 'openKakao'
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
  }
}
