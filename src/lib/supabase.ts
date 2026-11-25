import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseConfigured = Boolean(url && key)
// Anon key only. The service-role key must never be used in frontend code.
export const supabase = supabaseConfigured ? createClient(url!, key!) : null
