export const MIN_SIGNUP_AGE = 14
export const MAX_SIGNUP_AGE = 19
export const AGE_RESTRICTION_MESSAGE = '연 나이 14~19세(중고등학생)만 가입할 수 있어요.'
export const AGE_VERIFICATION_REQUIRED_MESSAGE = '생년월일을 입력해야 가입할 수 있어요.'

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function parseBirthDate(value: unknown, today = new Date()) {
  const birthDate = getString(value)
  const match = birthDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate) : null
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

  return birthDate
}

export function parseBirthYear(value: unknown, today = new Date()) {
  const currentYear = today.getFullYear()
  let birthYear: number | null = null

  if (typeof value === 'number' && Number.isInteger(value)) {
    birthYear = value
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/^\d{4}/)
    if (match) birthYear = Number(match[0])
  }

  if (!birthYear || birthYear < 1900 || birthYear > currentYear) {
    return null
  }

  return birthYear
}

export function calculateAnnualAgeFromBirthYear(birthYear: number, today = new Date()) {
  return today.getFullYear() - birthYear
}

export function calculateAnnualAge(birthDate: string, today = new Date()) {
  const parsedBirthDate = parseBirthDate(birthDate, today)
  if (!parsedBirthDate) return null

  const birthYear = parseBirthYear(parsedBirthDate, today)
  return birthYear ? calculateAnnualAgeFromBirthYear(birthYear, today) : null
}

export function isAllowedSignupAge(age: number) {
  return Number.isInteger(age) && age >= MIN_SIGNUP_AGE && age <= MAX_SIGNUP_AGE
}

export function isEligibleSignupAge(birthDate: string) {
  const age = calculateAnnualAge(birthDate)
  return age !== null && isAllowedSignupAge(age)
}

export function getEligibleSignupAge(birthDate: string) {
  const age = calculateAnnualAge(birthDate)
  return age !== null && isAllowedSignupAge(age) ? age : null
}

export function getEligibleSignupAgeFromBirthYear(birthYear: number) {
  const age = calculateAnnualAgeFromBirthYear(birthYear)
  return isAllowedSignupAge(age) ? age : null
}

export function assertEligibleSignupAge(birthDate: string) {
  if (!isEligibleSignupAge(birthDate)) {
    throw new Error(AGE_RESTRICTION_MESSAGE)
  }
}
