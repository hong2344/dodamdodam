import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

declare global {
  var __dodamdodamSupabase: SupabaseClient<Database> | undefined;
}

export const supabase =
  globalThis.__dodamdodamSupabase ?? createClient<Database>(supabaseUrl, supabaseAnonKey);

globalThis.__dodamdodamSupabase = supabase;

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Village = Database['public']['Tables']['villages']['Row'];
export type Letter = Database['public']['Tables']['letters']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
