#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Seleniumのインポート
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import chromedriver_binary # ChromeDriverのバイナリを自動でダウンロード・パスを通す
# BeautifulSoupのインポート
from bs4 import BeautifulSoup
import pandas as pd
# tqdmのインポートを削除（プログレスバーがエラー出力と混同されるため）
import json
import sys
from datetime import datetime
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
        raise Exception("Supabase接続情報が設定されていません")
    
    return create_client(url, key)

# 結果を格納する辞書
result = {
    "success": False,
    "added": [],
    "updated": [],
    "removed": [],
    "error": None
}

# Chromeドライバーの設定
options = webdriver.ChromeOptions()
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--headless')  # ヘッドレスモードを追加

driver = webdriver.Chrome(options=options)


try:
    # スクレイピングしたいWebページのURLを指定 
    url = "https://exp-t.jp/account/login/expa"  # スクレイピング対象のURLに変更してください
    driver.get(url)
    
    # ページの読み込みを待機
    wait = WebDriverWait(driver, 10)

except Exception as e:
    print(f"エラーが発生しました: {e}", file=sys.stderr)
# ログイン情報の入力
ID = "sekaino.hiroshi34@gmail.com"
PASSWORD = "h31503150h"

try:
    # IDの入力
    # id="loginId" の要素が見つかるまで待機
    id_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerMail")))
    id_element.send_keys(ID)  # 実際のIDに変更してください
    time.sleep(1)

    # パスワードの入力 
    # id="password" の要素が見つかるまで待機
    password_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerPassword")))
    password_element.send_keys(PASSWORD)  # 実際のパスワードに変更してください
    
    time.sleep(1)
    # ログイン情報の入力完了（ログは削除）

    # ログインボタンのクリック
    login_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#LoginForm > div.user-login-btn.mb16 > button")))
    login_button.click()

    time.sleep(1)

except Exception as e:
    print(f"ログイン情報の入力中にエラーが発生しました: {e}", file=sys.stderr)

driver.get("https://exp-t.jp/e/event/calendar")
time.sleep(5)
result_df = pd.DataFrame()

# ページのHTMLを取得
html = driver.page_source

# BeautifulSoup4で解析
soup = BeautifulSoup(html, 'html.parser')
schedules = soup.find(class_="mb30")
tables = schedules.find_all('table')
for table in tables:
    try:
        elements = table.find_all(class_='fw-b')
        date = elements[-2].get_text()
        day = date.split('(')[0]
        time = date.split(' ')[1].split('｜')[0]
        count = elements[-1].get_text()
        # day, time, countをDataFrameに変換
        df = pd.DataFrame([[day, time, count]], columns=['day', 'time', 'count'])
        result_df = pd.concat([result_df, df], ignore_index=True)
    except Exception as e:
        # エラーログは標準エラー出力に
        print(f"テーブル処理エラー: {e}", file=sys.stderr)
        continue  # エラーがあっても続行

# 既存のCSV保存処理は残す
result_df.to_csv('result_df.csv', index=False)

try:
    # Supabaseクライアントの初期化
    supabase_client = init_supabase()
    
    # 既存データを取得
    existing_response = supabase_client.table('seminars').select('*').eq('is_deleted', False).execute()
    existing_data = {
        (s['event_date'], s['event_time']): s 
        for s in existing_response.data
    }
    
    # 新しいデータを処理
    current_year = datetime.now().year
    new_data = {}
    
    for index, row in result_df.iterrows():
        # 日付の解析
        month, day_num = map(int, row['day'].split('/'))
        hour, minute = map(int, row['time'].split(':'))
        
        event_date = f"{current_year}-{month:02d}-{day_num:02d}"
        event_time = f"{hour:02d}:{minute:02d}:00"
        participant_count = int(row['count'])
        
        new_data[(event_date, event_time)] = {
            'event_date': event_date,
            'event_time': event_time,
            'participant_count': participant_count
        }
    
    # 差分を検出して更新
    # 1. 新規追加
    for key, data in new_data.items():
        if key not in existing_data:
            # 新規データを挿入
            seminar_data = {
                'event_date': data['event_date'],
                'event_time': data['event_time'],
                'participant_count': data['participant_count'],
                'year': int(data['event_date'].split('-')[0]),
                'month': int(data['event_date'].split('-')[1]),
                'day': int(data['event_date'].split('-')[2]),
                'scraped_at': datetime.now().isoformat(),
                'is_deleted': False
            }
            supabase_client.table('seminars').insert(seminar_data).execute()
            
            result['added'].append({
                'date': data['event_date'],
                'time': data['event_time'],
                'participants': data['participant_count']
            })
    
    # 2. 更新
    for key, data in new_data.items():
        if key in existing_data:
            old_data = existing_data[key]
            if old_data['participant_count'] != data['participant_count']:
                # 参加者数が変更された場合
                supabase_client.table('seminars').update({
                    'participant_count': data['participant_count'],
                    'scraped_at': datetime.now().isoformat()
                }).eq('id', old_data['id']).execute()
                
                result['updated'].append({
                    'date': data['event_date'],
                    'time': data['event_time'],
                    'oldParticipants': old_data['participant_count'],
                    'newParticipants': data['participant_count']
                })
    
    # 3. 削除（論理削除）
    for key, old_data in existing_data.items():
        if key not in new_data:
            # データが存在しなくなった場合
            supabase_client.table('seminars').update({
                'is_deleted': True,
                'deleted_at': datetime.now().isoformat()
            }).eq('id', old_data['id']).execute()
            
            result['removed'].append({
                'date': old_data['event_date'],
                'time': old_data['event_time']
            })
    
    result['success'] = True
    
except Exception as e:
    result['error'] = str(e)
    print(f"エラー: {e}", file=sys.stderr)

driver.quit()

# 結果をJSON形式で出力
print(json.dumps(result, ensure_ascii=False))