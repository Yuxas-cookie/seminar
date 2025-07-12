#!/usr/bin/env python3
"""
プロジェクトのセットアップスクリプト
"""

import os
import subprocess
import sys

def setup_environment():
    """環境のセットアップ"""
    print("🔧 環境セットアップを開始します...")
    
    # 1. 必要なディレクトリの作成
    directories = ['scraper', 'config', 'logs', 'data']
    for dir_name in directories:
        os.makedirs(dir_name, exist_ok=True)
        print(f"✓ ディレクトリ作成: {dir_name}/")
    
    # 2. .envファイルの作成（存在しない場合）
    if not os.path.exists('.env'):
        print("\n📝 .envファイルを作成します")
        print("以下の情報を入力してください：")
        
        supabase_url = input("Supabase URL: ").strip()
        supabase_key = input("Supabase Anon Key: ").strip()
        
        with open('.env', 'w') as f:
            f.write(f"SUPABASE_URL={supabase_url}\n")
            f.write(f"SUPABASE_KEY={supabase_key}\n")
        
        print("✓ .envファイルを作成しました")
    else:
        print("✓ .envファイルは既に存在します")
    
    # 3. 依存関係のインストール
    print("\n📦 依存関係をインストール中...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ 依存関係のインストール完了")
    except subprocess.CalledProcessError:
        print("✗ 依存関係のインストールに失敗しました")
        return False
    
    # 4. ChromeDriverの確認
    print("\n🌐 ChromeDriverの確認...")
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        
        options = Options()
        options.add_argument('--headless')
        driver = webdriver.Chrome(options=options)
        driver.quit()
        print("✓ ChromeDriverは正常に動作しています")
    except Exception as e:
        print("✗ ChromeDriverが見つかりません")
        print("  以下のコマンドでインストールしてください：")
        print("  Mac: brew install chromedriver")
        print("  または https://chromedriver.chromium.org/ からダウンロード")
        return False
    
    print("\n✅ セットアップが完了しました！")
    print("\n次のステップ:")
    print("1. Supabaseダッシュボードでテーブルを作成:")
    print("   supabase/schema.sql の内容を実行してください")
    print("2. スクレイピングを実行:")
    print("   python scraper/main.py")
    
    return True

if __name__ == "__main__":
    setup_environment()