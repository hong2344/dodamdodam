import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Village = Database['public']['Tables']['villages']['Row'];
export type Letter = Database['public']['Tables']['letters']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];