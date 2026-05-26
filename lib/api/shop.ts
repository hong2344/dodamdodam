import { supabase } from '../supabase';
import { Database } from '../database.types';

export type ShopItem = Database['public']['Tables']['shop_items']['Row'];
export type UserItem = Database['public']['Tables']['user_items']['Row'];

export async function getShopItems(category?: string): Promise<ShopItem[]> {
  let query = supabase.from('shop_items').select('*').order('price');
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getMyItems(): Promise<(UserItem & { shop_items: ShopItem })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_items')
    .select('*, shop_items(*)')
    .eq('profile_id', user.id);

  if (error) throw error;
  return (data ?? []) as any;
}

export async function buyItem(itemId: string) {
  const { error } = await supabase.rpc('buy_item', {
    target_item_id: itemId,
  });
  if (error) throw error;
}

export async function equipItem(userItemId: number) {
  const { error } = await supabase.rpc('equip_item', {
    target_user_item_id: String(userItemId),
  });
  if (error) throw error;
}

export async function getMyPoints(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data?.points ?? 0;
}