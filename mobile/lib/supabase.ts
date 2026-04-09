import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// Prefer EXPO_PUBLIC_ env vars (EAS Build), fall back to app.json extra (Expo Go)
const supabaseUrl: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseUrl() {
  return supabaseUrl;
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
