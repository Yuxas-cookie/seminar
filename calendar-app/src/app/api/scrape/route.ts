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

    console.log('Supabase Edge Functionを呼び出し中...')

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
      console.error('Edge Function エラー:', errorText)
      throw new Error(`Edge Function エラー: ${response.status}`)
    }

    const result: UpdateResult = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'スクレイピングに失敗しました')
    }
    
    console.log('スクレイピング完了:', {
      added: result.added.length,
      updated: result.updated.length,
      removed: result.removed.length
    })
    
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