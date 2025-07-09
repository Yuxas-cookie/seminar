import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 環境変数の状態を詳細にログ出力
console.log('=== Supabase Environment Variables Check ===')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || '❌ 未設定')
console.log('NEXT_PUBLIC_SUPABASE_URL length:', supabaseUrl?.length || 0)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✅ 設定済み (${supabaseAnonKey.substring(0, 20)}...)` : '❌ 未設定')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY length:', supabaseAnonKey?.length || 0)
console.log('==========================================')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Supabase環境変数が正しく設定されていません！')
  console.error('必要な環境変数:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
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