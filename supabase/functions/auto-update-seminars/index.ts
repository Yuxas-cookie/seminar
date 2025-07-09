import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// セミナーデータをスクレイピングする関数
async function scrapeSeminars() {
  try {
    // Pythonスクリプトを実行する代わりに、直接スクレイピングを実行
    const loginUrl = 'https://exp-t.jp/account/login/expa'
    const calendarUrl = 'https://exp-t.jp/e/event/calendar'
    
    // ログイン
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'MasterCustomerMail': 'sekaino.hiroshi34@gmail.com',
        'MasterCustomerPassword': 'h31503150h'
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error('ログインに失敗しました')
    }
    
    // セッションクッキーを取得
    const cookies = loginResponse.headers.get('set-cookie')
    
    // カレンダーページを取得
    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        'Cookie': cookies || ''
      }
    })
    
    const html = await calendarResponse.text()
    
    // HTMLをパース（簡易版）
    const seminars = []
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g
    const tables = html.match(tableRegex) || []
    
    for (const table of tables) {
      try {
        // fw-bクラスの要素を探す
        const fwbElements = table.match(/<[^>]*class=['"]fw-b['"][^>]*>([^<]*)<\/[^>]*>/g) || []
        
        if (fwbElements.length >= 2) {
          const dateText = fwbElements[fwbElements.length - 2].replace(/<[^>]*>/g, '')
          const countText = fwbElements[fwbElements.length - 1].replace(/<[^>]*>/g, '')
          
          // 日付と時刻を解析
          const [dayPart, timePart] = dateText.split(' ')
          const [month, day] = dayPart.split('/').map(Number)
          const [hour, minute] = timePart.split('｜')[0].split(':').map(Number)
          
          const currentYear = new Date().getFullYear()
          const eventDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          const eventTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
          
          seminars.push({
            event_date: eventDate,
            event_time: eventTime,
            participant_count: parseInt(countText),
            year: currentYear,
            month: month,
            day: day
          })
        }
      } catch (error) {
        console.error('テーブル解析エラー:', error)
        continue
      }
    }
    
    return seminars
  } catch (error) {
    console.error('Scraping error:', error)
    throw error
  }
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting automatic seminar update...')

    // 現在のセミナーデータを取得
    const { data: currentSeminars, error: fetchError } = await supabase
      .from('seminars')
      .select('*')
      .eq('is_deleted', false)
      .order('event_date')
      .order('event_time')

    if (fetchError) {
      throw fetchError
    }

    // 既存のセミナーの日時セットを作成
    const existingSet = new Set(
      currentSeminars?.map(s => `${s.event_date}_${s.event_time}`) || []
    )

    // 新しいセミナーデータをスクレイピング
    const scrapedSeminars = await scrapeSeminars()
    
    // 新規セミナーを抽出
    const newSeminars = scrapedSeminars.filter(s => 
      !existingSet.has(`${s.event_date}_${s.event_time}`)
    )

    // 削除されたセミナーを検出（スクレイピング結果に存在しないもの）
    const scrapedSet = new Set(
      scrapedSeminars.map(s => `${s.event_date}_${s.event_time}`)
    )
    
    const deletedSeminars = currentSeminars?.filter(s => 
      !scrapedSet.has(`${s.event_date}_${s.event_time}`)
    ) || []

    // 変更を適用
    let added = 0, updated = 0, removed = 0

    // 新規セミナーを追加
    if (newSeminars.length > 0) {
      const { error: insertError } = await supabase
        .from('seminars')
        .insert(
          newSeminars.map(s => ({
            ...s,
            scraped_at: new Date().toISOString()
          }))
        )
      
      if (insertError) {
        console.error('Error inserting seminars:', insertError)
      } else {
        added = newSeminars.length
      }
    }

    // 削除されたセミナーをソフトデリート
    if (deletedSeminars.length > 0) {
      const { error: deleteError } = await supabase
        .from('seminars')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .in('id', deletedSeminars.map(s => s.id))
      
      if (deleteError) {
        console.error('Error soft-deleting seminars:', deleteError)
      } else {
        removed = deletedSeminars.length
      }
    }

    // 既存セミナーの参加者数を更新（必要に応じて）
    // ここでは参加者数の変更検出ロジックを実装
    
    const result = {
      success: true,
      added,
      updated,
      removed,
      timestamp: new Date().toISOString()
    }

    // ログを記録
    const { error: logError } = await supabase
      .from('auto_update_logs')
      .insert({
        executed_at: new Date().toISOString(),
        added_count: added,
        updated_count: updated,
        removed_count: removed,
        success: true
      })
    
    if (logError) {
      console.error('Failed to log update:', logError)
    }

    console.log('Update completed:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Auto-update error:', error)
    
    // エラーログを記録
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      await supabase
        .from('auto_update_logs')
        .insert({
          executed_at: new Date().toISOString(),
          added_count: 0,
          updated_count: 0,
          removed_count: 0,
          success: false,
          error_message: error.message
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})