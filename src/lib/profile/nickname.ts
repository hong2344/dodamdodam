export const NICKNAME_MIN_LENGTH = 2
export const NICKNAME_MAX_LENGTH = 12

const NICKNAME_PATTERN = /^[\p{L}\p{N}]+$/u

export function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, '')
}

export function validateNickname(value: string) {
  const nickname = normalizeNickname(value)

  if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      nickname,
      error: `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`,
    }
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return {
      nickname,
      error: '닉네임은 한글, 영문, 숫자만 사용할 수 있어요.',
    }
  }

  return { nickname, error: null }
}
