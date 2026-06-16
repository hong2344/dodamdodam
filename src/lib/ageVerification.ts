export const MIN_SIGNUP_AGE = 13
export const MAX_SIGNUP_AGE = 18
export const AGE_RESTRICTION_MESSAGE = '만 13세에서 만 18세가 아닌 사람은 가입이 불가능합니다.'

export function calculateInternationalAge(birthDate: string, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > today
  ) {
    return null
  }

  let age = today.getFullYear() - year
  const hasHadBirthdayThisYear =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day)

  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

export function isEligibleSignupAge(birthDate: string) {
  const age = calculateInternationalAge(birthDate)
  return age !== null && age >= MIN_SIGNUP_AGE && age <= MAX_SIGNUP_AGE
}

export function getEligibleSignupAge(birthDate: string) {
  return isEligibleSignupAge(birthDate) ? calculateInternationalAge(birthDate) : null
}

export function assertEligibleSignupAge(birthDate: string) {
  if (!isEligibleSignupAge(birthDate)) {
    throw new Error(AGE_RESTRICTION_MESSAGE)
  }
}

export function getBirthDateFromKakaoMetadata(metadata: Record<string, unknown>) {
  const birthdate = getString(metadata.birthdate)
  if (birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return birthdate

  const birthyear = getString(metadata.birthyear)
  const birthday = getString(metadata.birthday)
  if (birthyear && birthday && /^\d{4}$/.test(birthyear) && /^\d{4}$/.test(birthday)) {
    return `${birthyear}-${birthday.slice(0, 2)}-${birthday.slice(2)}`
  }

  if (birthday && /^\d{8}$/.test(birthday)) {
    return `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6)}`
  }

  return null
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
