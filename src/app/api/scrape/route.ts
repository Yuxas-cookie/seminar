import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // 認証情報の取得
    const email = process.env.SCRAPING_EMAIL || 'sekaino.hiroshi34@gmail.com'
    const password = process.env.SCRAPING_PASSWORD || 'h31503150h'
    
    // ログイン処理
    const loginResponse = await fetch('https://exp-t.jp/account/login/expa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'MasterCustomerMail': email,
        'MasterCustomerPassword': password
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error('ログインに失敗しました')
    }
    
    // クッキーを取得
    const cookies = loginResponse.headers.get('set-cookie') || ''
    
    // カレンダーページを取得
    const calendarResponse = await fetch('https://exp-t.jp/e/event/calendar', {
      headers: {
        'Cookie': cookies
      }
    })
    
    const html = await calendarResponse.text()
    
    // HTMLからセミナー情報を抽出
    const seminars = parseCalendarHTML(html)
    
    // 既存データを取得
    const { data: existingData } = await supabase
      .from('seminars')
      .select('*')
      .eq('is_deleted', false)
    
    const existingMap = new Map(
      existingData?.map(s => [`${s.event_date}_${s.event_time}`, s]) || []
    )
    
    const result = {
      success: true,
      added: [],
      updated: [],
      removed: []
    }
    
    const currentSeminars = new Map()
    
    // 新規・更新処理
    for (const seminar of seminars) {
      const key = `${seminar.event_date}_${seminar.event_time}`
      currentSeminars.set(key, seminar)
      
      const existing = existingMap.get(key)
      
      if (!existing) {
        // 新規追加
        const { error } = await supabase
          .from('seminars')
          .insert({
            ...seminar,
            scraped_at: new Date().toISOString(),
            is_deleted: false
          })
        
        if (!error) {
          result.added.push({
            date: seminar.event_date,
            time: seminar.event_time,
            participants: seminar.participant_count
          })
        }
      } else if (existing.participant_count !== seminar.participant_count) {
        // 更新
        const { error } = await supabase
          .from('seminars')
          .update({
            participant_count: seminar.participant_count,
            scraped_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (!error) {
          result.updated.push({
            date: seminar.event_date,
            time: seminar.event_time,
            oldParticipants: existing.participant_count,
            newParticipants: seminar.participant_count
          })
        }
      }
    }
    
    // 削除処理
    for (const [key, existing] of existingMap) {
      if (!currentSeminars.has(key)) {
        const { error } = await supabase
          .from('seminars')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (!error) {
          result.removed.push({
            date: existing.event_date,
            time: existing.event_time
          })
        }
      }
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: 'スクレイピング処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// HTMLをパースしてセミナー情報を抽出
function parseCalendarHTML(html: string) {
  const seminars = []
  
  // mb30クラスを含む要素を探す
  const mb30Match = html.match(/<[^>]*class=['"][^'"]*mb30[^'"]*['"][^>]*>[\s\S]*?<\/[^>]*>/g)
  if (!mb30Match) return seminars
  
  // テーブルを抽出
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g
  const tables = html.match(tableRegex) || []
  
  for (const table of tables) {
    try {
      // fw-bクラスの要素を探す
      const fwbRegex = /<[^>]*class=['"][^'"]*fw-b[^'"]*['"][^>]*>([^<]*)</g
      const fwbMatches = [...table.matchAll(fwbRegex)]
      
      if (fwbMatches.length >= 2) {
        const dateText = fwbMatches[fwbMatches.length - 2][1]
        const countText = fwbMatches[fwbMatches.length - 1][1]
        
        // 日付と時刻を解析 (例: "12/25(水) 10:00｜90分")
        const dateMatch = dateText.match(/(\d+)\/(\d+).*?(\d+):(\d+)/)
        if (dateMatch) {
          const [_, month, day, hour, minute] = dateMatch
          const currentYear = new Date().getFullYear()
          
          seminars.push({
            event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
            participant_count: parseInt(countText) || 0,
            year: currentYear,
            month: parseInt(month),
            day: parseInt(day)
          })
        }
      }
    } catch (error) {
      console.error('テーブル解析エラー:', error)
      continue
    }
  }
  
  return seminars
}