import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// セミナーデータをスクレイピングする関数（実際のサイトに合わせて調整が必要）
async function scrapeSeminars() {
  try {
    // ここに実際のスクレイピングコードを実装
    // 例：
    // const response = await fetch('https://example.com/seminars')
    // const html = await response.text()
    // const seminars = parseHTML(html)
    
    // 仮のデータを返す（実装時は実際のスクレイピング結果を返す）
    return []
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