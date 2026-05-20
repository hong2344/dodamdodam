import { supabase } from '../supabase'

// ─── 휴대폰 인증 ────────────────────────────────────────────

/** 휴대폰 번호로 OTP 발송 */
export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  })
  if (error) throw error
}

/** OTP 코드 검증 */
export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  if (error) throw error
  return data
}

// ─── 회원가입 플로우 ─────────────────────────────────────────

export interface RegisterPayload {
  phone: string
  password: string
  age: number
  villageId: string
  nickname: string
  avatarUrl?: string
}

/** 회원가입: auth 유저 생성 + profiles 삽입 */
export async function register(payload: RegisterPayload) {
  // 1) 이메일 없이 휴대폰+비밀번호로 가입
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    phone: payload.phone,
    password: payload.password,
  })
  if (signUpError) throw signUpError

  const userId = authData.user?.id
  if (!userId) throw new Error('유저 생성 실패')

  // 2) profiles 테이블에 상세 정보 삽입
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    age: payload.age,
    village_id: payload.villageId,
    nickname: payload.nickname,
    avatar_url: payload.avatarUrl ?? null,
  })
  if (profileError) throw profileError

  return authData
}

// ─── 로그인 ──────────────────────────────────────────────────

export async function login(phone: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  })
  if (error) throw error
  return data
}

// ─── 로그아웃 ─────────────────────────────────────────────────

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ─── 비밀번호 재설정 ──────────────────────────────────────────

/** 비밀번호 재설정용 OTP 발송 */
export async function sendResetOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  })
  if (error) throw error
}

/** OTP 확인 후 새 비밀번호 설정 */
export async function resetPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
  return data
}

// ─── 세션/유저 조회 ───────────────────────────────────────────

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}