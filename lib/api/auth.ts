import { supabase } from '../supabase';
import { Database } from '../database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

export type RegisterData = {
  phone_number?: string;
  real_name?: string;
  age?: number;
  birth_date?: string;
  village_id?: string;
  nickname?: string;
  email?: string;
  password?: string;
  match_category?: string;
  avatar_color?: string;
  avatar_type?: number;
};

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

type SignUpInput = {
  email: string;
  password: string;
  birth_date: string;
  age: number;
  nickname: string;
  match_category?: string;
};

export async function signUp(data: SignUpInput) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });
  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error('사용자 ID를 가져올 수 없어요.');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: data.email,
    username: data.email.split('@')[0],
    login_username: data.email,
    nickname: data.nickname,
    age: data.age,
    birth_date: data.birth_date,
    match_category: data.match_category ?? null,
    avatar_color: '#A8C5A0',
    avatar_type: 1,
    is_verified: true,
    created_at: new Date().toISOString(),
  } satisfies ProfileInsert);
  if (profileError) throw profileError;

  return authData;
}

export async function checkNickname(nickname: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (error) throw error;
  return data === null;
}

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

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
