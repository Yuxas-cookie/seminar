import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function POST() {
  let browser = null
  
  try {
    // Vercel環境用の設定
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    
    // ログインページへ
    await page.goto('https://exp-t.jp/account/login/expa')
    
    // ログイン
    await page.type('#MasterCustomerMail', 'sekaino.hiroshi34@gmail.com')
    await page.type('#MasterCustomerPassword', 'h31503150h')
    await page.click('#LoginForm > div.user-login-btn.mb16 > button')
    
    // ナビゲーション待機
    await page.waitForNavigation()
    
    // カレンダーページへ
    await page.goto('https://exp-t.jp/e/event/calendar')
    
    // mb30要素を待機
    await page.waitForSelector('.mb30', { timeout: 10000 })
    
    // セミナー情報を抽出
    const seminars = await page.evaluate(() => {
      const results: any[] = []
      const scheduleBlock = document.querySelector('.mb30')
      
      if (scheduleBlock) {
        const tables = scheduleBlock.querySelectorAll('table')
        
        tables.forEach(table => {
          const fwbElements = table.querySelectorAll('.fw-b')
          if (fwbElements.length >= 2) {
            const dateText = fwbElements[fwbElements.length - 2].textContent?.trim() || ''
            const countText = fwbElements[fwbElements.length - 1].textContent?.trim() || ''
            
            // 日付解析
            const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/)
            if (dateMatch) {
              const [_, month, day, hour, minute] = dateMatch
              const currentYear = new Date().getFullYear()
              
              results.push({
                event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
                participant_count: parseInt(countText) || 0,
                year: currentYear,
                month: parseInt(month),
                day: parseInt(day)
              })
            }
          }
        })
      }
      
      return results
    })
    
    // Supabaseへの保存処理は別途実装
    return NextResponse.json({
      success: true,
      seminars,
      message: `${seminars.length}件のセミナーを取得しました`
    })
    
  } catch (error) {
    console.error('スクレイピングエラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'スクレイピング中にエラーが発生しました'
      },
      { status: 500 }
    )
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}