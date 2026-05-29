import { supabase } from '../supabase';
import { Database } from '../database.types';

export type Letter = Database['public']['Tables']['letters']['Row'];
export type Reply = Database['public']['Tables']['replies']['Row'];

export async function getInbox(): Promise<Letter[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('receiver_id', user.id)
    .order('sent_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function sendLetter({
  matchId, receiverId, content, paperStyle, sticker,
}: {
  matchId: string;
  receiverId: string;
  content: string;
  paperStyle?: string;
  sticker?: string;
}): Promise<Letter> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요.');

  const { data, error } = await supabase
    .from('letters')
    .insert({
      match_id: matchId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      paper_style: paperStyle ?? 'default',
      sticker: sticker ?? null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAsRead(letterId: string) {
  const { error } = await supabase
    .from('letters')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', letterId);

  if (error) throw error;
}

export type DeliveryStatus = {
  current_step: number;
  step_name: string;
  remaining_minutes: number;
};

export async function getDeliveryStatus(letterId: string): Promise<DeliveryStatus | null> {
  const { data, error } = await supabase.rpc('get_delivery_status', {
    letter_id: letterId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function sendReply({
  letterId, receiverId, content,
}: {
  letterId: string;
  receiverId: string;
  content: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요.');

  const { data, error } = await supabase
    .from('replies')
    .insert({
      letter_id: letterId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
