#!/usr/bin/env python3
"""
ブラウザの開発者ツールを使って、実際のAPIエンドポイントを確認するスクリプト
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# ネットワークログを有効にする
caps = DesiredCapabilities.CHROME
caps['goog:loggingPrefs'] = {'performance': 'ALL'}

options = webdriver.ChromeOptions()
options.add_experimental_option('w3c', False)
options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})

driver = webdriver.Chrome(options=options)

try:
    # ログインページにアクセス
    driver.get("https://exp-t.jp/account/login/expa")
    
    wait = WebDriverWait(driver, 10)
    
    # ログイン
    ID = "sekaino.hiroshi34@gmail.com"
    PASSWORD = "h31503150h"
    
    id_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerMail")))
    id_element.send_keys(ID)
    
    password_element = wait.until(EC.presence_of_element_located((By.ID, "MasterCustomerPassword")))
    password_element.send_keys(PASSWORD)
    
    login_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#LoginForm > div.user-login-btn.mb16 > button")))
    login_button.click()
    
    time.sleep(2)
    
    # カレンダーページに移動
    driver.get("https://exp-t.jp/e/event/calendar")
    time.sleep(5)
    
    # ネットワークログを取得
    logs = driver.get_log('performance')
    
    print("=== APIエンドポイントの候補 ===\n")
    
    api_calls = []
    for log in logs:
        message = log['message']
        if 'Network.responseReceived' in message:
            if any(keyword in message for keyword in ['json', 'api', 'event', 'calendar', 'schedule']):
                api_calls.append(message)
                print(message)
                print("-" * 80)
    
    print(f"\n合計 {len(api_calls)} 個のAPI呼び出しを検出しました")
    
    # ページのソースも確認
    print("\n=== ページソースの確認 ===")
    page_source = driver.page_source
    
    # JavaScriptで生成されたコンテンツがあるか確認
    if 'mb30' in page_source:
        print("mb30クラスが見つかりました")
        mb30_index = page_source.find('mb30')
        print(f"周辺のHTML: {page_source[mb30_index-100:mb30_index+200]}")
    else:
        print("mb30クラスが見つかりません")
    
    input("ブラウザの開発者ツールを確認してください。Enterキーで終了...")
    
finally:
    driver.quit()