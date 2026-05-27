import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://zaoniaczzfbstxiuiifa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphb25pYWN6emZic3R4aXVpaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODc1MTgsImV4cCI6MjA5NDA2MzUxOH0.iCybx4pGuYpbb2PueZOEnDTcUo8f748DEaEl3TX7-VI';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Village = Database['public']['Tables']['villages']['Row'];
export type Letter = Database['public']['Tables']['letters']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];