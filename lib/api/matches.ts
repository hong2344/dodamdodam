import { supabase } from '../supabase';
import { Database } from '../database.types';

export type Match = Database['public']['Tables']['matches']['Row'];

export async function getMyMatch(): Promise<Match | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requestMatch(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('age')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase.rpc('find_best_match', {
    p_sender_id: user.id,
    p_sender_age: profile?.age ?? 20,
  });

  if (error) throw error;
  return data;
}

export async function getMatchStatus(): Promise<'waiting' | 'active' | 'completed'> {
  const match = await getMyMatch();
  if (!match) return 'waiting';
  if (match.status === 'active') return 'active';
  return 'completed';
}

export async function getMatchPartner(match: Match) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, age, location, avatar_type, avatar_color')
    .eq('id', partnerId)
    .single();

  if (error) throw error;
  return data;
}