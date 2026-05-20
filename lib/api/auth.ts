import { supabase } from '../supabase';
import { Database } from '../database.types';

// 자동생성 타입 활용
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

// 회원가입 단계별 임시 저장용 타입
export type RegisterData = {
  phone_number?: string;
  real_name?: string;
  age?: number;
  birth_date?: string;
  village_id?: string;
  nickname?: string;
  email?: string;
  password?: string;
  avatar_color?: string;
  avatar_type?: number;
};

// ── 로그인 ──────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── 로그아웃 ─────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── 비밀번호 재설정 메일 발송 ────────────────────────────
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'yourapp://reset-password',
  });
  if (error) throw error;
}

// ── 비밀번호 변경 ────────────────────────────────────────
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── 회원가입 ─────────────────────────────────────────────
export async function signUp(data: Required<RegisterData>) {
  // 1. Auth 계정 생성
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });
  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error('유저 ID를 가져올 수 없어요.');

  // 2. profiles 테이블에 모든 정보 insert
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: data.email,
    username: data.email.split('@')[0], // 임시 username
    phone_number: data.phone_number,
    real_name: data.real_name,
    age: data.age,
    birth_date: data.birth_date,
    village_id: data.village_id,
    nickname: data.nickname,
    avatar_color: data.avatar_color ?? '#A8C5A0',
    avatar_type: data.avatar_type ?? 1,
    login_username: data.email,
    is_verified: true,
    created_at: new Date().toISOString(),
  } satisfies ProfileInsert);
  if (profileError) throw profileError;

  return authData;
}

// ── 닉네임 중복 체크 ──────────────────────────────────────
export async function checkNickname(nickname: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (error) throw error;
  return data === null; // true = 사용 가능
}

// ── 현재 유저 프로필 조회 ────────────────────────────────
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

// ── 세션 조회 ─────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}