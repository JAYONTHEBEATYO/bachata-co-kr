"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseBrowserConfig = Boolean(supabaseUrl && supabaseAnonKey);

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (!hasSupabaseBrowserConfig) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "bachata.auth.v1"
      }
    });
  }
  return browserClient;
};
