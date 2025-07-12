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
from tqdm import tqdm
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
        print("警告: Supabase接続情報が設定されていません。CSVファイルのみに保存します。")
        return None
    
    return create_client(url, key)

# DataFrameをSupabaseにアップロード
def upload_to_supabase(client, df):
    if not client:
        return False
    
    uploaded_count = 0
    current_year = datetime.now().year
    
    for index, row in df.iterrows():
        try:
            # 日付の解析（MM/DD形式）
            month, day = map(int, row['day'].split('/'))
            
            # event_dateの作成（現在の年を使用）
            event_date = datetime(current_year, month, day).date()
            
            # 時刻の解析
            hour, minute = map(int, row['time'].split(':'))
            event_time = f"{hour:02d}:{minute:02d}:00"
            
            # データの準備
            seminar_data = {
                'event_date': event_date.isoformat(),
                'event_time': event_time,
                'participant_count': int(row['count']),
                'year': current_year,
                'month': month,
                'day': day,
                'scraped_at': datetime.now().isoformat()
            }
            
            # 既存データのチェック
            existing = client.table('seminars').select('*').eq(
                'event_date', seminar_data['event_date']
            ).eq(
                'event_time', seminar_data['event_time']
            ).execute()
            
            if existing.data:
                # 既存データを更新
                result = client.table('seminars').update({
                    'participant_count': seminar_data['participant_count'],
                    'scraped_at': seminar_data['scraped_at']
                }).eq('id', existing.data[0]['id']).execute()
                print(f"更新: {event_date} {event_time} - 参加者数: {seminar_data['participant_count']}")
            else:
                # 新規データを挿入
                result = client.table('seminars').insert(seminar_data).execute()
                print(f"挿入: {event_date} {event_time} - 参加者数: {seminar_data['participant_count']}")
            
            uploaded_count += 1
            
        except Exception as e:
            print(f"行 {index} のアップロードエラー: {e}")
            continue
    
    print(f"\n✅ {uploaded_count}/{len(df)}件のデータをSupabaseにアップロードしました")
    return uploaded_count > 0

# Chromeドライバーの設定
# ChromeDriverのオプションを設定
# ヘッドレスモードを有効化して画面を表示しない
options = webdriver.ChromeOptions()
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--headless')  # ヘッドレスモードを追加

driver = webdriver.Chrome(options=options)

# Supabaseクライアントの初期化
supabase_client = init_supabase()

try:
    # スクレイピングしたいWebページのURLを指定 
    url = "https://exp-t.jp/account/login/expa"  # スクレイピング対象のURLに変更してください
    driver.get(url)
    
    # ページの読み込みを待機
    wait = WebDriverWait(driver, 10)

except Exception as e:
    print(f"エラーが発生しました: {e}")
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
    print("IDの入力が完了しました")

    # ログインボタンのクリック
    login_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#LoginForm > div.user-login-btn.mb16 > button")))
    login_button.click()

    time.sleep(1)

except Exception as e:
    print(f"ログイン情報の入力中にエラーが発生しました: {e}")

driver.get("https://exp-t.jp/e/event/calendar")
time.sleep(5)
result_df = pd.DataFrame()

# ページのHTMLを取得
html = driver.page_source

# BeautifulSoup4で解析
soup = BeautifulSoup(html, 'html.parser')
schedules = soup.find(class_="mb30")
tables = schedules.find_all('table')
for table in tqdm(tables):
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
        print(e)
        break

# CSVファイルに保存
result_df.to_csv('result_df.csv', index=False)
print(f"✅ CSVファイルに{len(result_df)}件のデータを保存しました: result_df.csv")

# Supabaseにアップロード
if supabase_client:
    upload_to_supabase(supabase_client, result_df)
else:
    print("Supabaseへのアップロードはスキップされました")

driver.quit()