import { NextResponse } from 'next/server'

// 型定義
interface UpdateResult {
  success: boolean
  added: Array<{ date: string; time: string; participants: number }>
  updated: Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>
  removed: Array<{ date: string; time: string }>
  error?: string
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase設定が不完全です')
    }

    // Supabase Edge Functionを呼び出し
    const response = await fetch(`${supabaseUrl}/functions/v1/scrape-seminars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Edge Function エラー: ${errorText}`)
    }

    const result: UpdateResult = await response.json()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'スクレイピング処理でエラーが発生しました',
        added: [],
        updated: [],
        removed: []
      },
      { status: 500 }
    )
  }
}