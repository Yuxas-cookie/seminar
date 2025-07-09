import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  },
  db: {
    schema: 'public'
  }
})

export interface Staff {
  id: string
  name: string
  theme_color: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface Seminar {
  id: string
  event_date: string
  event_time: string
  participant_count: number
  year: number
  month: number
  day: number
  staff_id?: string
  staff?: Staff
  created_at: string
  updated_at: string
  scraped_at: string
  is_deleted?: boolean
  deleted_at?: string
}

export interface BlockedDate {
  id: string
  date: string
  reason?: string
  staff_id?: string
  staff?: Staff
  created_at: string
  updated_at: string
}