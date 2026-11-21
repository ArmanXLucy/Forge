import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from './firebase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let client: SupabaseClient | null = null

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers)
        // When Supabase is configured for Firebase third-party auth, this
        // Firebase ID token is what storage policies evaluate. The anon key
        // remains the project API key; no service-role key is used client-side.
        const token = await auth?.currentUser?.getIdToken().catch(() => null)
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return fetch(input, { ...init, headers })
      },
    },
  })
}

export { client as supabase }
export const supabaseProjectUrl = supabaseUrl ?? null
export const supabasePublishableKeyPresent = Boolean(supabaseAnonKey)
