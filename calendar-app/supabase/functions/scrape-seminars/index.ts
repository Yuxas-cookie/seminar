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

    // ログイン処理（GETでログインページを取得）
    const loginPageResponse = await fetch('https://exp-t.jp/account/login/expa')
    const loginPageHtml = await loginPageResponse.text()
    
    // CSRFトークンなどがあれば抽出（必要に応じて）
    console.log('ログインページ取得完了')

    // ログイン処理
    const loginResponse = await fetch('https://exp-t.jp/account/login/expa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: new URLSearchParams({
        'MasterCustomerMail': email,
        'MasterCustomerPassword': password
      }),
      redirect: 'manual' // リダイレクトを手動で処理
    })

    console.log('ログインレスポンスステータス:', loginResponse.status)
    
    // クッキーを収集
    const setCookieHeaders = loginResponse.headers.getSetCookie()
    const cookieString = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ')
    console.log('取得したクッキー数:', setCookieHeaders.length)

    // カレンダーページを取得
    const calendarResponse = await fetch('https://exp-t.jp/e/event/calendar', {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    const html = await calendarResponse.text()
    console.log('HTMLの長さ:', html.length)
    console.log('HTML冒頭500文字:', html.substring(0, 500))

    // HTMLからセミナー情報を抽出
    const seminars = parseCalendarHTML(html)
    console.log(`${seminars.length}件のセミナーを取得`)
    
    // デバッグ: 最初の3件を表示
    if (seminars.length > 0) {
      console.log('取得したセミナー（最初の3件）:', seminars.slice(0, 3))
    }

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
  
  console.log('HTMLパース開始...')
  
  // mb30クラスを持つ要素を探す - Pythonと同じ方法を使用
  const mb30Pattern = /<[^>]+class\s*=\s*["'][^"']*\bmb30\b[^"']*["'][^>]*>[\s\S]*?(?=<[^>]+class\s*=\s*["'][^"']*\bmb30\b|$)/gi
  const mb30Matches = html.match(mb30Pattern)
  
  if (!mb30Matches || mb30Matches.length === 0) {
    console.log('mb30クラスの要素が見つかりません')
    console.log('HTML内のclass属性を確認:', html.match(/class\s*=\s*["'][^"']*mb30[^"']*["']/gi)?.slice(0, 3))
    
    // mb30を含む要素をより広範囲に探す
    const mb30Start = html.indexOf('mb30')
    if (mb30Start !== -1) {
      console.log('mb30文字列は存在しますが、正規表現でマッチしませんでした')
      console.log('mb30周辺のHTML:', html.substring(Math.max(0, mb30Start - 50), Math.min(html.length, mb30Start + 150)))
    }
    
    return seminars
  }
  
  console.log(`mb30要素数: ${mb30Matches.length}`)
  
  // 最初のmb30要素のみを処理（Pythonスクリプトと同じ）
  const scheduleBlock = mb30Matches[0]
  console.log('mb30ブロックの最初の500文字:', scheduleBlock.substring(0, 500))
  
  // テーブルを抽出
  const tables = scheduleBlock.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []
  console.log(`テーブル数: ${tables.length}`)
  
  for (const table of tables) {
    const seminar = parseTable(table)
    if (seminar) {
      seminars.push(seminar)
      console.log(`セミナー追加: ${seminar.event_date} ${seminar.event_time} - ${seminar.participant_count}人`)
    }
  }
  
  console.log(`パース完了: ${seminars.length}件のセミナーを抽出`)
  return seminars
}

// テーブルからセミナー情報を抽出
function parseTable(tableHtml: string): Seminar | null {
  try {
    // fw-bクラスの要素を探す - より柔軟なパターン
    const fwbPattern = /<[^>]+class\s*=\s*["']([^"']*\bfw-b\b[^"']*|fw-b)["'][^>]*>([^<]+)</gi
    const fwbMatches = [...tableHtml.matchAll(fwbPattern)]
    
    if (fwbMatches.length < 2) {
      // fw-bが見つからない場合、異なるパターンを試す
      const altPattern = /<[^>]+class\s*=\s*["'][^"']*fw-b[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi
      const altMatches = [...tableHtml.matchAll(altPattern)]
      
      if (altMatches.length >= 2) {
        console.log('代替パターンでfw-b要素を検出')
        // 内部のテキストを抽出
        const texts = altMatches.map(match => {
          const textMatch = match[0].match(/>([^<]+)</);
          return textMatch ? textMatch[1].trim() : '';
        }).filter(text => text);
        
        if (texts.length >= 2) {
          const dateText = texts[texts.length - 2]
          const countText = texts[texts.length - 1]
          
          console.log(`解析中 - 日付: ${dateText}, 人数: ${countText}`)
          
          // 日付と時刻を解析
          const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
          if (dateMatch) {
            const [_, month, day, hour, minute] = dateMatch
            const currentYear = new Date().getFullYear()
            
            return {
              event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
              event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
              participant_count: parseInt(countText) || 0,
              year: currentYear,
              month: parseInt(month),
              day: parseInt(day)
            }
          }
        }
      }
      return null
    }
    
    // 通常のfw-bパターン処理
    const dateText = fwbMatches[fwbMatches.length - 2][2].trim()
    const countText = fwbMatches[fwbMatches.length - 1][2].trim()
    
    console.log(`解析中 - 日付: ${dateText}, 人数: ${countText}`)
    
    // 日付と時刻を解析 (例: "7/12(金) 12:00｜90分" または "7/12(金) 12:00")
    const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
    if (dateMatch) {
      const [_, month, day, hour, minute] = dateMatch
      const currentYear = new Date().getFullYear()
      
      return {
        event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
        participant_count: parseInt(countText) || 0,
        year: currentYear,
        month: parseInt(month),
        day: parseInt(day)
      }
    }
  } catch (error) {
    console.error('テーブル解析エラー:', error)
  }
  
  return null
}