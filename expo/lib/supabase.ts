import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import type { Database } from '@/types/database';

// Read from app.json extra (most reliable) → env vars → hardcoded fallback
const extra = Constants.expoConfig?.extra;
const supabaseUrl =
  extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://faufcfppnkwrxabgvknt.supabase.co';
const supabaseAnonKey =
  extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdWZjZnBwbmt3cnhhYmd2a250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzQyNDYsImV4cCI6MjA5MDg1MDI0Nn0.s82fzQzwSo6XvIp1tLUsomeELkZcDOs16IupjkGA4OM';

console.log('[Supabase] init with URL:', supabaseUrl.substring(0, 30) + '...');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
