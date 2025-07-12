#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
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
        raise Exception("Supabase接続情報が設定されていません")
    
    return create_client(url, key)

# メイン処理
def main():
    # 結果を格納する辞書
    result = {
        "success": False,
        "added": [],
        "updated": [],
        "removed": [],
        "error": None
    }
    
    try:
        print("=== スクレイピング処理開始 ===")
        print(f"開始時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Supabaseクライアントの初期化
        print("ステップ 1/7: Supabaseクライアントを初期化中...")
        supabase_client = init_supabase()
        print("✅ Supabase接続成功")
        
        # 既存データを取得
        print("ステップ 2/7: 既存のセミナーデータを取得中...")
        existing_response = supabase_client.table('seminars').select('*').execute()
        existing_data = {
            (s['event_date'], s['event_time']): s 
            for s in existing_response.data
        }
        print(f"✅ 既存データ {len(existing_data)} 件を取得")
        
        # 実行日を取得
        today = datetime.now().date()
        
        # Chromeドライバーの設定
        print("ステップ 3/7: Chromeドライバーを起動中...")
        options = webdriver.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-software-rasterizer')
        
        # システムにインストールされているChromeDriverを使用
        driver = webdriver.Chrome(options=options)
        print("✅ Chromeドライバー起動成功")
        
        try:
            # ログインページにアクセス
            print("ステップ 4/7: ログインページにアクセス中...")
            url = "https://exp-t.jp/account/login/expa"
            driver.get(url)
            print("✅ ログインページに到達")
            
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
            print("✅ ログイン成功")
            
            # カレンダーページに移動
            print("ステップ 5/7: セミナーカレンダーをスクレイピング中...")
            driver.get("https://exp-t.jp/e/event/calendar")
            time.sleep(5)
            print("✅ カレンダーページにアクセス成功")
            
            # ページのHTMLを取得
            html = driver.page_source
            
            # BeautifulSoup4で解析
            soup = BeautifulSoup(html, 'html.parser')
            schedules = soup.find(class_="mb30")
            tables = schedules.find_all('table')
            
            # 新しいデータを格納
            new_data = {}
            current_year = datetime.now().year
            
            for table in tables:
                try:
                    elements = table.find_all(class_='fw-b')
                    date = elements[-2].get_text()
                    day = date.split('(')[0]
                    time_str = date.split(' ')[1].split('｜')[0]
                    count = elements[-1].get_text()
                    
                    # 日付の解析
                    month, day_num = map(int, day.split('/'))
                    hour, minute = map(int, time_str.split(':'))
                    
                    event_date = f"{current_year}-{month:02d}-{day_num:02d}"
                    event_time = f"{hour:02d}:{minute:02d}:00"
                    participant_count = int(count)
                    
                    new_data[(event_date, event_time)] = {
                        'event_date': event_date,
                        'event_time': event_time,
                        'participant_count': participant_count
                    }
                    print(f"[スクレイピング] 取得: {event_date} {event_time} - 参加者数: {participant_count}人", file=sys.stderr)
                    
                except Exception as e:
                    continue
            
        finally:
            driver.quit()
        
        # 差分を検出して更新
        print(f"\nステップ 6/7: データベースを更新中...")
        print(f"スクレイピングで取得したセミナー数: {len(new_data)}")
        
        # 1. 新規追加または復活
        for key, data in new_data.items():
            if key not in existing_data:
                # 完全に新規のデータを挿入
                seminar_data = {
                    'event_date': data['event_date'],
                    'event_time': data['event_time'],
                    'participant_count': data['participant_count'],
                    'year': int(data['event_date'].split('-')[0]),
                    'month': int(data['event_date'].split('-')[1]),
                    'day': int(data['event_date'].split('-')[2]),
                    'scraped_at': datetime.now().isoformat()
                }
                supabase_client.table('seminars').insert(seminar_data).execute()
                
                result['added'].append({
                    'date': data['event_date'],
                    'time': data['event_time'],
                    'participants': data['participant_count']
                })
                print(f"[新規追加] {data['event_date']} {data['event_time']} - 参加者数: {data['participant_count']}人", file=sys.stderr)
        
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
                    print(f"[更新] {data['event_date']} {data['event_time']} - 参加者数: {old_data['participant_count']}人 → {data['participant_count']}人", file=sys.stderr)
        
        # 3. 削除（物理削除）- 実行日以降の日程のみ対象
        print(f"\n[削除チェック開始] 実行日: {today}", file=sys.stderr)
        
        # スクレイピング結果のキーセットを作成
        new_data_keys = set(new_data.keys())
        print(f"スクレイピングで取得した日程: {len(new_data_keys)}件", file=sys.stderr)
        
        # デバッグ: データの詳細を表示
        print("\n[既存のセミナー（実行日以降）]", file=sys.stderr)
        for key, data in existing_data.items():
            event_date = datetime.strptime(data['event_date'], '%Y-%m-%d').date()
            if event_date >= today:
                print(f"  - {key} (ID: {data['id']})", file=sys.stderr)
        
        print("\n[スクレイピングで取得したセミナー]", file=sys.stderr)
        for key in new_data_keys:
            print(f"  - {key}", file=sys.stderr)
        
        # 削除対象をカウント
        delete_count = 0
        
        for key, old_data in existing_data.items():
            # 日付を比較用に変換
            event_date = datetime.strptime(old_data['event_date'], '%Y-%m-%d').date()
            
            # 実行日以降の日程で、新しいデータに含まれていない場合のみ削除
            if event_date >= today and key not in new_data_keys:
                delete_count += 1
                print(f"\n[削除対象] {old_data['event_date']} {old_data['event_time']}", file=sys.stderr)
                
                # データを物理削除（完全に削除）
                try:
                    supabase_client.table('seminars').delete().eq('id', old_data['id']).execute()
                    
                    result['removed'].append({
                        'date': old_data['event_date'],
                        'time': old_data['event_time']
                    })
                    print(f"  → 削除完了", file=sys.stderr)
                except Exception as e:
                    print(f"  → 削除エラー: {e}", file=sys.stderr)
        
        print(f"\n[削除処理完了] {delete_count}件の日程を削除しました", file=sys.stderr)
        
        result['success'] = True
        
        # 結果サマリー
        print(f"\nステップ 7/7: 処理完了")
        print(f"=== 処理結果サマリー ===")
        print(f"✅ 新規追加: {len(result['added'])}件")
        print(f"✅ 更新: {len(result['updated'])}件")
        print(f"✅ 削除: {len(result['removed'])}件")
        
        # 変更がない場合のメッセージ
        if not result['added'] and not result['updated'] and not result['removed']:
            print("ℹ️  変更はありませんでした")
        
        print(f"\n完了時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=== スクレイピング処理正常終了 ===\n")
        
    except Exception as e:
        result['error'] = str(e)
        print(f"\n❌ エラーが発生しました: {e}")
        print(f"エラー時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=== スクレイピング処理異常終了 ===\n")
    
    # 結果をJSON形式で出力
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()