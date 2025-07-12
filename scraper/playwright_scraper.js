const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://fiwmedfqmhefebbhhqmv.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeSeminars() {
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('ログインページへアクセス...');
    await page.goto('https://exp-t.jp/account/login/expa');
    
    // ログイン
    console.log('ログイン処理...');
    await page.fill('#MasterCustomerMail', 'sekaino.hiroshi34@gmail.com');
    await page.fill('#MasterCustomerPassword', 'h31503150h');
    await page.click('#LoginForm > div.user-login-btn.mb16 > button');
    
    // ログイン後の遷移を待機
    await page.waitForLoadState('networkidle');
    
    // カレンダーページへ
    console.log('カレンダーページへアクセス...');
    await page.goto('https://exp-t.jp/e/event/calendar');
    await page.waitForLoadState('networkidle');
    
    // mb30要素を待機
    await page.waitForSelector('.mb30', { timeout: 10000 });
    
    // デバッグ用にスクリーンショットを保存
    await page.screenshot({ path: 'calendar_page.png' });
    
    // セミナー情報を抽出
    const seminars = await page.evaluate(() => {
      const results = [];
      const scheduleBlock = document.querySelector('.mb30');
      
      if (scheduleBlock) {
        const tables = scheduleBlock.querySelectorAll('table');
        console.log(`テーブル数: ${tables.length}`);
        
        tables.forEach((table, index) => {
          const fwbElements = table.querySelectorAll('.fw-b');
          console.log(`テーブル${index}: fw-b要素数 = ${fwbElements.length}`);
          
          if (fwbElements.length >= 2) {
            const dateText = fwbElements[fwbElements.length - 2].textContent.trim();
            const countText = fwbElements[fwbElements.length - 1].textContent.trim();
            
            // 日付解析
            const dateMatch = dateText.match(/(\d+)\/(\d+)[^0-9]*(\d+):(\d+)/);
            if (dateMatch) {
              const [_, month, day, hour, minute] = dateMatch;
              const currentYear = new Date().getFullYear();
              
              results.push({
                event_date: `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                event_time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`,
                participant_count: parseInt(countText) || 0,
                year: currentYear,
                month: parseInt(month),
                day: parseInt(day)
              });
            }
          }
        });
      }
      
      return results;
    });
    
    console.log(`取得したセミナー: ${seminars.length}件`);
    seminars.forEach(s => {
      console.log(`- ${s.event_date} ${s.event_time}: ${s.participant_count}人`);
    });
    
    // 以下、Supabaseへの保存処理は同じ
    return await updateSupabase(seminars);
    
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function updateSupabase(seminars) {
  // 既存データを取得
  const { data: existingData } = await supabase
    .from('seminars')
    .select('*');
  
  const existingMap = new Map(
    existingData?.map(s => [`${s.event_date}_${s.event_time}`, s]) || []
  );
  
  const result = {
    success: true,
    added: [],
    updated: [],
    removed: []
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentSeminars = new Map();
  
  // 新規・更新処理
  for (const seminar of seminars) {
    const key = `${seminar.event_date}_${seminar.event_time}`;
    currentSeminars.set(key, seminar);
    
    const existing = existingMap.get(key);
    
    if (!existing) {
      // 新規追加
      const { error } = await supabase
        .from('seminars')
        .insert({
          ...seminar,
          scraped_at: new Date().toISOString()
        });
      
      if (!error) {
        result.added.push({
          date: seminar.event_date,
          time: seminar.event_time,
          participants: seminar.participant_count
        });
        console.log(`[新規追加] ${seminar.event_date} ${seminar.event_time} - ${seminar.participant_count}人`);
      }
    } else if (existing.participant_count !== seminar.participant_count) {
      // 更新
      const { error } = await supabase
        .from('seminars')
        .update({
          participant_count: seminar.participant_count,
          scraped_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (!error) {
        result.updated.push({
          date: seminar.event_date,
          time: seminar.event_time,
          oldParticipants: existing.participant_count,
          newParticipants: seminar.participant_count
        });
        console.log(`[更新] ${seminar.event_date} ${seminar.event_time} - ${existing.participant_count}人 → ${seminar.participant_count}人`);
      }
    }
  }
  
  // 削除処理
  for (const [key, existing] of existingMap) {
    const eventDate = new Date(existing.event_date);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate >= today && !currentSeminars.has(key)) {
      const { error } = await supabase
        .from('seminars')
        .delete()
        .eq('id', existing.id);
      
      if (!error) {
        result.removed.push({
          date: existing.event_date,
          time: existing.event_time
        });
        console.log(`[削除] ${existing.event_date} ${existing.event_time}`);
      }
    }
  }
  
  console.log(JSON.stringify(result));
  return result;
}

// 実行
if (require.main === module) {
  scrapeSeminars()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { scrapeSeminars };