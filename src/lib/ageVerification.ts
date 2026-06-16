export const MIN_SIGNUP_AGE = 14
export const MAX_SIGNUP_AGE = 19
export const AGE_RESTRICTION_MESSAGE = '연 나이 14~19세(중고등학생)만 가입할 수 있어요.'
export const AGE_VERIFICATION_REQUIRED_MESSAGE = '생년월일을 입력해야 가입할 수 있어요.'
export const KAKAO_SIGNUP_SCOPES = 'profile_nickname profile_image account_email friends'

type MetadataRecord = Record<string, unknown>

const BIRTH_DATE_PATHS = [
  ['birthdate'],
  ['birth_date'],
  ['kakao_account', 'birthdate'],
  ['kakao_account', 'birth_date'],
  ['kakaoAccount', 'birthdate'],
] as const

const BIRTH_YEAR_PATHS = [
  ['birthyear'],
  ['birth_year'],
  ['birthYear'],
  ['year_of_birth'],
  ['kakao_account', 'birthyear'],
  ['kakao_account', 'birth_year'],
  ['kakaoAccount', 'birthyear'],
  ['account', 'birthyear'],
] as const

const BIRTHDAY_PATHS = [
  ['birthday'],
  ['birth_day'],
  ['kakao_account', 'birthday'],
  ['kakaoAccount', 'birthday'],
] as const

function isRecord(value: unknown): value is MetadataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPath(source: MetadataRecord, path: readonly string[]) {
  let value: unknown = source

  for (const key of path) {
    if (!isRecord(value)) return null
    value = value[key]
  }

  return value
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readStringPath(source: MetadataRecord, paths: readonly (readonly string[])[]) {
  for (const path of paths) {
    const value = getString(readPath(source, path))
    if (value) return value
  }

  return null
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

export function getBirthDateFromKakaoMetadata(metadata: unknown) {
  if (!isRecord(metadata)) return null

  const birthdate = parseBirthDate(readStringPath(metadata, BIRTH_DATE_PATHS))
  if (birthdate) return birthdate

  const birthyear = parseBirthYear(readStringPath(metadata, BIRTH_YEAR_PATHS))
  const birthday = readStringPath(metadata, BIRTHDAY_PATHS)

  if (birthyear && birthday && /^\d{4}$/.test(birthday)) {
    return parseBirthDate(`${birthyear}-${birthday.slice(0, 2)}-${birthday.slice(2)}`)
  }

  if (birthday && /^\d{8}$/.test(birthday)) {
    return parseBirthDate(`${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6)}`)
  }

  return null
}

export function getMetadataSources(user: { user_metadata?: unknown; identities?: { identity_data?: unknown }[] }) {
  const sources: MetadataRecord[] = []

  if (isRecord(user.user_metadata)) {
    sources.push(user.user_metadata)
  }

  for (const identity of user.identities ?? []) {
    if (isRecord(identity.identity_data)) {
      sources.push(identity.identity_data)
    }
  }

  return sources
}

export function getKakaoBirthInfoFromMetadataSources(sources: MetadataRecord[]) {
  for (const source of sources) {
    const birthDate = getBirthDateFromKakaoMetadata(source)
    if (birthDate) {
      const age = getEligibleSignupAge(birthDate)
      if (age !== null) return { birthDate, age, birthYear: parseBirthYear(birthDate) }
    }

    const birthYear = parseBirthYear(readStringPath(source, BIRTH_YEAR_PATHS))
    if (birthYear) {
      const age = getEligibleSignupAgeFromBirthYear(birthYear)
      if (age !== null) return { birthDate: null, age, birthYear }
      return { birthDate: null, age: null, birthYear }
    }
  }

  return { birthDate: null, age: null, birthYear: null }
}
