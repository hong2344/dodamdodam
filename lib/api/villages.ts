

import { supabase } from '../supabase';
import { Village } from '../supabase';

export async function getVillages(): Promise<Village[]> {
  const { data, error } = await supabase
    .from('villages')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}
