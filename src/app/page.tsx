'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

// FullCalendarはクライアントサイドでのみ動作するため、dynamic importを使用
const Dashboard = dynamic(
  () => import('@/components/Dashboard'),
  { ssr: false }
)

export default function Home() {
  useEffect(() => {
    // クライアントサイドでの環境変数チェック
    console.log('=== Client-side Environment Check ===')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ 未設定')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定')
    console.log('====================================')
  }, [])
  
  return <Dashboard />
}