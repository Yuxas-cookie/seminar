import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Seminar {
  id?: string
  event_date: string
  event_time: string
  participant_count: number
  year: number
  month: number
  day: number
  scraped_at?: string
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアントの初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 認証情報
    const email = Deno.env.get('SCRAPING_EMAIL') || 'sekaino.hiroshi34@gmail.com'
    const password = Deno.env.get('SCRAPING_PASSWORD') || 'h31503150h'

    console.log('スクレイピング開始...')

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
    console.log(`${seminars.length}件のセミナーを取得`)

    // 既存データを取得（全て）
    const { data: existingData, error: fetchError } = await supabase
      .from('seminars')
      .select('*')

    if (fetchError) {
      throw fetchError
    }

    const existingMap = new Map<string, Seminar>(
      existingData?.map((s: Seminar) => [`${s.event_date}_${s.event_time}`, s]) || []
    )

    const result = {
      success: true,
      added: [] as Array<{ date: string; time: string; participants: number }>,
      updated: [] as Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>,
      removed: [] as Array<{ date: string; time: string }>
    }

    const currentSeminars = new Map<string, Seminar>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

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
            scraped_at: new Date().toISOString()
          })

        if (!error) {
          result.added.push({
            date: seminar.event_date,
            time: seminar.event_time,
            participants: seminar.participant_count
          })
          console.log(`[新規追加] ${seminar.event_date} ${seminar.event_time} - 参加者数: ${seminar.participant_count}人`)
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
          console.log(`[更新] ${seminar.event_date} ${seminar.event_time} - 参加者数: ${existing.participant_count}人 → ${seminar.participant_count}人`)
        }
      }
    }

    // 削除処理（物理削除） - 実行日以降の日程のみ
    for (const [key, existing] of existingMap) {
      const eventDate = new Date(existing.event_date)
      eventDate.setHours(0, 0, 0, 0)

      // 実行日以降の日程で、新しいデータに含まれていない場合
      if (eventDate >= today && !currentSeminars.has(key)) {
        const { error } = await supabase
          .from('seminars')
          .delete()
          .eq('id', existing.id)

        if (!error) {
          result.removed.push({
            date: existing.event_date,
            time: existing.event_time
          })
          console.log(`[削除] ${existing.event_date} ${existing.event_time}`)
        }
      }
    }

    // 変更がない場合
    if (result.added.length === 0 && result.updated.length === 0 && result.removed.length === 0) {
      console.log('[情報] 変更はありませんでした')
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('エラー:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        added: [],
        updated: [],
        removed: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  }
})

// HTMLをパースしてセミナー情報を抽出
function parseCalendarHTML(html: string): Seminar[] {
  const seminars: Seminar[] = []
  
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