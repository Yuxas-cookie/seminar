#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 環境変数の読み込み
load_dotenv()

# Supabaseクライアントの初期化
def init_supabase():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    if not url or not key:
        print("警告: Supabase接続情報が設定されていません。", file=sys.stderr)
        return None
    
    return create_client(url, key)

# スクレイピング処理
def scrape_seminars():
    # Chromeドライバーの設定
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--headless')

    driver = webdriver.Chrome(options=options)
    
    try:
        # ログインページにアクセス
        url = "https://exp-t.jp/account/login/expa"
        driver.get(url)
        
        wait = WebDriverWait(driver, 10)
        
        # ログイン情報の入力
        ID = "sekaino.hiroshi34@gmail.com"
        PASSWORD = "h31503150h"
        
        # IDの入力
        id_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerMail")))
        id_element.send_keys(ID)
        time.sleep(1)

        # パスワードの入力 
        password_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerPassword")))
        password_element.send_keys(PASSWORD)
        time.sleep(1)

        # ログインボタンのクリック
        login_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#LoginForm > div.user-login-btn.mb16 > button")))
        login_button.click()
        time.sleep(1)

        # カレンダーページに移動
        driver.get("https://exp-t.jp/e/event/calendar")
        time.sleep(5)
        
        # ページのHTMLを取得
        html = driver.page_source
        
        # BeautifulSoup4で解析
        soup = BeautifulSoup(html, 'html.parser')
        schedules = soup.find(class_="mb30")
        tables = schedules.find_all('table')
        
        seminars = []
        current_year = datetime.now().year
        
        for table in tables:
            try:
                elements = table.find_all(class_='fw-b')
                date = elements[-2].get_text()
                day = date.split('(')[0]
                time = date.split(' ')[1].split('｜')[0]
                count = elements[-1].get_text()
                
                # 日付の解析
                month, day_num = map(int, day.split('/'))
                hour, minute = map(int, time.split(':'))
                
                seminars.append({
                    'event_date': f"{current_year}-{month:02d}-{day_num:02d}",
                    'event_time': f"{hour:02d}:{minute:02d}:00",
                    'participant_count': int(count)
                })
            except Exception as e:
                continue
        
        return seminars
        
    except Exception as e:
        print(f"スクレイピングエラー: {e}", file=sys.stderr)
        return []
    finally:
        driver.quit()

# メイン処理
def main():
    supabase_client = init_supabase()
    if not supabase_client:
        print(json.dumps({"error": "Supabase接続エラー"}))
        return
    
    # 既存データを取得
    try:
        existing = supabase_client.table('seminars').select('*').execute()
        existing_seminars = {
            (s['event_date'], s['event_time']): s 
            for s in existing.data
        }
    except Exception as e:
        print(json.dumps({"error": f"既存データ取得エラー: {e}"}))
        return
    
    # スクレイピング実行
    new_seminars = scrape_seminars()
    if not new_seminars:
        print(json.dumps({"error": "スクレイピング失敗"}))
        return
    
    # 差分を計算
    added = []
    updated = []
    
    for seminar in new_seminars:
        key = (seminar['event_date'], seminar['event_time'])
        
        if key in existing_seminars:
            # 既存データの更新チェック
            old_data = existing_seminars[key]
            if old_data['participant_count'] != seminar['participant_count']:
                # 更新
                try:
                    supabase_client.table('seminars').update({
                        'participant_count': seminar['participant_count'],
                        'scraped_at': datetime.now().isoformat()
                    }).eq('id', old_data['id']).execute()
                    
                    updated.append({
                        'date': seminar['event_date'],
                        'time': seminar['event_time'],
                        'old_count': old_data['participant_count'],
                        'new_count': seminar['participant_count']
                    })
                except Exception as e:
                    print(f"更新エラー: {e}", file=sys.stderr)
        else:
            # 新規追加
            try:
                seminar_data = {
                    **seminar,
                    'year': int(seminar['event_date'].split('-')[0]),
                    'month': int(seminar['event_date'].split('-')[1]),
                    'day': int(seminar['event_date'].split('-')[2]),
                    'scraped_at': datetime.now().isoformat()
                }
                supabase_client.table('seminars').insert(seminar_data).execute()
                
                added.append({
                    'date': seminar['event_date'],
                    'time': seminar['event_time'],
                    'count': seminar['participant_count']
                })
            except Exception as e:
                print(f"挿入エラー: {e}", file=sys.stderr)
    
    # 削除されたデータを検出
    new_keys = {(s['event_date'], s['event_time']) for s in new_seminars}
    removed = []
    
    for key, old_data in existing_seminars.items():
        if key not in new_keys:
            # 削除フラグを立てる（実際には削除しない）
            try:
                supabase_client.table('seminars').update({
                    'is_deleted': True,
                    'deleted_at': datetime.now().isoformat()
                }).eq('id', old_data['id']).execute()
                
                removed.append({
                    'date': old_data['event_date'],
                    'time': old_data['event_time']
                })
            except Exception as e:
                print(f"削除フラグエラー: {e}", file=sys.stderr)
    
    # 結果を出力
    result = {
        "success": True,
        "added": added,
        "updated": updated,
        "removed": removed,
        "summary": f"追加: {len(added)}件, 更新: {len(updated)}件, 削除: {len(removed)}件"
    }
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()