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

  const debugLogs: string[] = []
  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage, data || '')
    debugLogs.push(logMessage + (data ? ` ${JSON.stringify(data)}` : ''))
  }

  try {
    addLog('=== Edge Function スクレイピング開始 ===')
    
    // Supabaseクライアントの初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    addLog('Supabase URL', supabaseUrl.substring(0, 30) + '...')
    addLog('Supabase Key exists', !!supabaseKey)
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    addLog('Supabaseクライアント初期化完了')

    // 認証情報
    const email = Deno.env.get('SCRAPING_EMAIL') || 'sekaino.hiroshi34@gmail.com'
    const password = Deno.env.get('SCRAPING_PASSWORD') || 'h31503150h'
    addLog('認証情報', { email, passwordLength: password.length })

    addLog('注意: Edge Functionでは動的なJavaScript実行ができないため、静的なHTMLパースのみ可能です')

    // ログイン処理（GETでログインページを取得）
    addLog('ステップ1: ログインページ取得開始')
    const loginPageResponse = await fetch('https://exp-t.jp/account/login/expa')
    addLog('ログインページレスポンス', {
      status: loginPageResponse.status,
      statusText: loginPageResponse.statusText,
      headers: Object.fromEntries(loginPageResponse.headers.entries())
    })
    
    const loginPageHtml = await loginPageResponse.text()
    addLog('ログインページHTML取得完了', {
      length: loginPageHtml.length,
      hasLoginForm: loginPageHtml.includes('LoginForm'),
      hasMasterCustomerMail: loginPageHtml.includes('MasterCustomerMail'),
      hasMasterCustomerPassword: loginPageHtml.includes('MasterCustomerPassword')
    })
    
    // CSRFトークンの検索
    const csrfMatch = loginPageHtml.match(/name="csrf_token".*?value="([^"]+)"/)
    if (csrfMatch) {
      addLog('CSRFトークン発見', csrfMatch[1])
    } else {
      addLog('CSRFトークンが見つかりません')
    }

    // ログイン処理
    addLog('ステップ2: ログインPOSTリクエスト送信')
    const loginFormData = new URLSearchParams({
      'MasterCustomerMail': email,
      'MasterCustomerPassword': password
    })
    addLog('ログインフォームデータ', loginFormData.toString())
    
    const loginResponse = await fetch('https://exp-t.jp/account/login/expa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      },
      body: loginFormData,
      redirect: 'manual' // リダイレクトを手動で処理
    })

    addLog('ログインレスポンス受信', {
      status: loginResponse.status,
      statusText: loginResponse.statusText,
      headers: Object.fromEntries(loginResponse.headers.entries())
    })
    
    // クッキーを収集
    const setCookieHeaders = loginResponse.headers.getSetCookie()
    const cookieString = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ')
    addLog('クッキー収集', {
      cookieCount: setCookieHeaders.length,
      cookies: setCookieHeaders,
      cookieString: cookieString
    })

    // リダイレクト先を確認
    if (loginResponse.status === 302 || loginResponse.status === 303) {
      const location = loginResponse.headers.get('location')
      addLog('リダイレクト検出', { status: loginResponse.status, location })
    } else {
      addLog('リダイレクトなし', { status: loginResponse.status })
    }

    // ログインレスポンスのボディを確認
    const loginResponseBody = await loginResponse.text()
    addLog('ログインレスポンスボディ', {
      length: loginResponseBody.length,
      first500: loginResponseBody.substring(0, 500),
      hasError: loginResponseBody.includes('error') || loginResponseBody.includes('エラー')
    })

    // カレンダーページを取得
    addLog('ステップ3: カレンダーページ取得開始')
    const calendarResponse = await fetch('https://exp-t.jp/e/event/calendar', {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Referer': 'https://exp-t.jp/account/login/expa'
      }
    })

    addLog('カレンダーレスポンス受信', {
      status: calendarResponse.status,
      statusText: calendarResponse.statusText,
      headers: Object.fromEntries(calendarResponse.headers.entries())
    })
    
    const html = await calendarResponse.text()
    addLog('カレンダーHTML取得完了', {
      length: html.length,
      hasTitle: html.includes('<title'),
      title: html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || 'タイトルなし'
    })
    
    // ログインチェック
    const isLoggedIn = !html.includes('ログイン') || html.includes('ログアウト')
    addLog('ログイン状態チェック', {
      isLoggedIn,
      hasLoginText: html.includes('ログイン'),
      hasLogoutText: html.includes('ログアウト')
    })
    
    // HTML内の重要な要素を確認
    addLog('ステップ4: HTML要素の検索')
    
    // mb30クラスの存在を確認
    const mb30Index = html.indexOf('mb30')
    addLog('mb30クラス検索', {
      found: mb30Index > -1,
      position: mb30Index,
      context: mb30Index > 0 ? html.substring(Math.max(0, mb30Index - 100), Math.min(html.length, mb30Index + 200)) : null
    })
    
    // fw-bクラスの存在を確認
    const fwbIndex = html.indexOf('fw-b')
    addLog('fw-bクラス検索', {
      found: fwbIndex > -1,
      position: fwbIndex,
      context: fwbIndex > 0 ? html.substring(Math.max(0, fwbIndex - 100), Math.min(html.length, fwbIndex + 200)) : null
    })
    
    // tableタグの存在を確認
    const tableCount = (html.match(/<table/g) || []).length
    addLog('tableタグ検索', { count: tableCount })
    
    // カレンダー関連の要素を検索
    const hasCalendar = html.includes('calendar') || html.includes('カレンダー')
    const hasEvent = html.includes('event') || html.includes('イベント')
    addLog('カレンダー関連要素', { hasCalendar, hasEvent })

    // HTMLからセミナー情報を抽出
    addLog('ステップ5: HTMLパース開始')
    const seminars = parseCalendarHTML(html, addLog)
    addLog('HTMLパース完了', {
      seminarCount: seminars.length,
      seminars: seminars.slice(0, 3) // 最初の3件のみログに記録
    })
    
    // 既存データを取得（全て）
    addLog('ステップ6: 既存データ取得開始')
    const { data: existingData, error: fetchError } = await supabase
      .from('seminars')
      .select('*')

    if (fetchError) {
      addLog('既存データ取得エラー', fetchError)
      throw fetchError
    }

    addLog('既存データ取得完了', {
      count: existingData?.length || 0,
      samples: existingData?.slice(0, 3) || []
    })

    const existingMap = new Map<string, Seminar>(
      existingData?.map((s: Seminar) => [`${s.event_date}_${s.event_time}`, s]) || []
    )

    const result = {
      success: true,
      added: [] as Array<{ date: string; time: string; participants: number }>,
      updated: [] as Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>,
      removed: [] as Array<{ date: string; time: string }>,
      debugLogs: debugLogs // デバッグログを結果に含める
    }

    const currentSeminars = new Map<string, Seminar>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    addLog('ステップ7: データベース更新処理開始', {
      todayDate: today.toISOString(),
      newSeminarCount: seminars.length,
      existingCount: existingMap.size
    })

    // 新規・更新処理
    let processedCount = 0
    for (const seminar of seminars) {
      const key = `${seminar.event_date}_${seminar.event_time}`
      currentSeminars.set(key, seminar)

      const existing = existingMap.get(key)

      if (!existing) {
        // 新規追加
        addLog(`処理中 [${++processedCount}/${seminars.length}] 新規追加`, { key, seminar })
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
          addLog('新規追加成功', { key })
        } else {
          addLog('新規追加エラー', { key, error })
        }
      } else if (existing.participant_count !== seminar.participant_count) {
        // 更新
        addLog(`処理中 [${++processedCount}/${seminars.length}] 更新`, {
          key,
          oldCount: existing.participant_count,
          newCount: seminar.participant_count
        })
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
          addLog('更新成功', { key })
        } else {
          addLog('更新エラー', { key, error })
        }
      } else {
        addLog(`処理中 [${++processedCount}/${seminars.length}] 変更なし`, { key })
      }
    }

    // 削除処理（物理削除） - 実行日以降の日程のみ
    addLog('ステップ8: 削除処理開始')
    let deleteCount = 0
    for (const [key, existing] of existingMap) {
      const eventDate = new Date(existing.event_date)
      eventDate.setHours(0, 0, 0, 0)

      // 実行日以降の日程で、新しいデータに含まれていない場合
      if (eventDate >= today && !currentSeminars.has(key)) {
        deleteCount++
        addLog(`削除対象 [${deleteCount}]`, {
          key,
          eventDate: eventDate.toISOString(),
          isAfterToday: eventDate >= today,
          notInCurrent: !currentSeminars.has(key)
        })
        
        const { error } = await supabase
          .from('seminars')
          .delete()
          .eq('id', existing.id)

        if (!error) {
          result.removed.push({
            date: existing.event_date,
            time: existing.event_time
          })
          addLog('削除成功', { key })
        } else {
          addLog('削除エラー', { key, error })
        }
      }
    }

    // 変更がない場合
    if (result.added.length === 0 && result.updated.length === 0 && result.removed.length === 0) {
      addLog('処理完了: 変更なし')
    } else {
      addLog('処理完了', {
        added: result.added.length,
        updated: result.updated.length,
        removed: result.removed.length
      })
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
    addLog('エラー発生', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        added: [],
        updated: [],
        removed: [],
        debugLogs: debugLogs
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
function parseCalendarHTML(html: string, addLog: (msg: string, data?: any) => void): Seminar[] {
  const seminars: Seminar[] = []
  
  addLog('HTMLパース詳細開始')
  
  // mb30クラスを持つ要素を探す - Pythonと同じ方法を使用
  const mb30Pattern = /<[^>]+class\s*=\s*["'][^"']*\bmb30\b[^"']*["'][^>]*>[\s\S]*?(?=<[^>]+class\s*=\s*["'][^"']*\bmb30\b|$)/gi
  const mb30Matches = html.match(mb30Pattern)
  
  if (!mb30Matches || mb30Matches.length === 0) {
    addLog('mb30クラスの要素が見つかりません - 詳細調査')
    
    // class属性の確認
    const classMatches = html.match(/class\s*=\s*["'][^"']*mb30[^"']*["']/gi)
    addLog('class属性でmb30を検索', {
      found: classMatches?.length || 0,
      samples: classMatches?.slice(0, 3) || []
    })
    
    // mb30を含む要素をより広範囲に探す
    const mb30Start = html.indexOf('mb30')
    if (mb30Start !== -1) {
      addLog('mb30文字列の位置', {
        position: mb30Start,
        context: html.substring(Math.max(0, mb30Start - 200), Math.min(html.length, mb30Start + 300))
      })
      
      // 簡易的な方法でmb30ブロックを取得
      const simpleMatch = html.substring(mb30Start - 50)
      const endIndex = simpleMatch.search(/<div[^>]*class[^>]*mb30/i)
      if (endIndex > 0) {
        const block = simpleMatch.substring(0, endIndex)
        addLog('簡易抽出したmb30ブロック', {
          length: block.length,
          first500: block.substring(0, 500)
        })
      }
    } else {
      addLog('mb30文字列が見つかりません')
    }
    
    return seminars
  }
  
  addLog('mb30要素検出', {
    count: mb30Matches.length,
    firstElementLength: mb30Matches[0].length
  })
  
  // 最初のmb30要素のみを処理（Pythonスクリプトと同じ）
  const scheduleBlock = mb30Matches[0]
  addLog('mb30ブロック詳細', {
    length: scheduleBlock.length,
    first1000: scheduleBlock.substring(0, 1000)
  })
  
  // テーブルを抽出
  const tables = scheduleBlock.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []
  addLog('テーブル抽出結果', {
    count: tables.length,
    tableLengths: tables.map(t => t.length)
  })
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    addLog(`テーブル[${i}]解析開始`, {
      length: table.length,
      first300: table.substring(0, 300)
    })
    
    const seminar = parseTable(table, addLog)
    if (seminar) {
      seminars.push(seminar)
      addLog(`セミナー抽出成功[${i}]`, seminar)
    } else {
      addLog(`セミナー抽出失敗[${i}]`)
    }
  }
  
  addLog('HTMLパース完了サマリー', {
    totalSeminars: seminars.length,
    seminars: seminars
  })
  
  return seminars
}

// テーブルからセミナー情報を抽出
function parseTable(tableHtml: string, addLog: (msg: string, data?: any) => void): Seminar | null {
  try {
    addLog('テーブル解析詳細', {
      hasTable: tableHtml.includes('<table'),
      hasTd: tableHtml.includes('<td'),
      hasFwb: tableHtml.includes('fw-b')
    })
    
    // fw-bクラスの要素を探す - より柔軟なパターン
    const fwbPattern = /<[^>]+class\s*=\s*["']([^"']*\bfw-b\b[^"']*|fw-b)["'][^>]*>([^<]+)</gi
    const fwbMatches = [...tableHtml.matchAll(fwbPattern)]
    
    addLog('fw-bパターンマッチ結果', {
      matchCount: fwbMatches.length,
      matches: fwbMatches.map(m => ({ class: m[1], text: m[2] }))
    })
    
    if (fwbMatches.length < 2) {
      // fw-bが見つからない場合、異なるパターンを試す
      addLog('fw-b標準パターンで見つからず、代替パターンを試行')
      
      const altPattern = /<[^>]+class\s*=\s*["'][^"']*fw-b[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi
      const altMatches = [...tableHtml.matchAll(altPattern)]
      
      addLog('代替パターンマッチ結果', {
        matchCount: altMatches.length,
        matches: altMatches.map(m => m[0].substring(0, 100))
      })
      
      if (altMatches.length >= 2) {
        // 内部のテキストを抽出
        const texts = altMatches.map(match => {
          const textMatch = match[0].match(/>([^<]+)</);
          return textMatch ? textMatch[1].trim() : '';
        }).filter(text => text);
        
        addLog('抽出されたテキスト', texts)
        
        if (texts.length >= 2) {
          const dateText = texts[texts.length - 2]
          const countText = texts[texts.length - 1]
          
          addLog('日付・人数候補', { dateText, countText })
          
          // 日付と時刻を解析
          const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
          if (dateMatch) {
            const [_, month, day, hour, minute] = dateMatch
            const currentYear = new Date().getFullYear()
            
            const seminar = {
              event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
              event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
              participant_count: parseInt(countText) || 0,
              year: currentYear,
              month: parseInt(month),
              day: parseInt(day)
            }
            
            addLog('セミナー情報抽出成功（代替パターン）', seminar)
            return seminar
          } else {
            addLog('日付パターンマッチ失敗', { dateText })
          }
        }
      }
      
      // さらに別のパターンを試す - すべてのテキストを抽出
      addLog('さらなる代替方法を試行')
      const allTexts = tableHtml.match(/>([^<]+)</g)?.map(m => m.slice(1, -1).trim()).filter(t => t) || []
      addLog('テーブル内の全テキスト', allTexts)
      
      // 日付パターンと数字を探す
      for (let i = 0; i < allTexts.length - 1; i++) {
        const dateMatch = allTexts[i].match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
        if (dateMatch && /^\d+$/.test(allTexts[i + 1])) {
          const [_, month, day, hour, minute] = dateMatch
          const currentYear = new Date().getFullYear()
          
          const seminar = {
            event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
            participant_count: parseInt(allTexts[i + 1]) || 0,
            year: currentYear,
            month: parseInt(month),
            day: parseInt(day)
          }
          
          addLog('セミナー情報抽出成功（テキスト全探索）', seminar)
          return seminar
        }
      }
      
      return null
    }
    
    // 通常のfw-bパターン処理
    const dateText = fwbMatches[fwbMatches.length - 2][2].trim()
    const countText = fwbMatches[fwbMatches.length - 1][2].trim()
    
    addLog('標準パターンでの抽出', { dateText, countText })
    
    // 日付と時刻を解析 (例: "7/12(金) 12:00｜90分" または "7/12(金) 12:00")
    const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
    if (dateMatch) {
      const [_, month, day, hour, minute] = dateMatch
      const currentYear = new Date().getFullYear()
      
      const seminar = {
        event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
        participant_count: parseInt(countText) || 0,
        year: currentYear,
        month: parseInt(month),
        day: parseInt(day)
      }
      
      addLog('セミナー情報抽出成功（標準パターン）', seminar)
      return seminar
    } else {
      addLog('日付パターンマッチ失敗（標準）', { dateText })
    }
  } catch (error) {
    addLog('テーブル解析エラー', {
      message: error.message,
      stack: error.stack
    })
  }
  
  return null
}