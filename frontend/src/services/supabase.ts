// Supabase se usa SOLO para identidad (Auth). Los datos salen de la API (api.ts).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const authConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url, anonKey)
  : null
