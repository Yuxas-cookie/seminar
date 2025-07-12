#!/usr/bin/env python3
"""
CSVファイルまたはDataFrameからSupabaseにデータをアップロードするスクリプト
"""

import os
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

load_dotenv()

class SupabaseUploader:
    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            raise ValueError("Supabase URLとKeyを.envファイルに設定してください")
        
        self.client: Client = create_client(url, key)
    
    def upload_from_csv(self, csv_path: str):
        """CSVファイルからデータをアップロード"""
        try:
            # CSVファイルを読み込み
            df = pd.read_csv(csv_path)
            print(f"CSVファイルを読み込みました: {len(df)}件のデータ")
            
            # データをアップロード
            return self.upload_dataframe(df)
            
        except Exception as e:
            print(f"CSVファイル読み込みエラー: {e}")
            return False
    
    def upload_dataframe(self, df: pd.DataFrame):
        """DataFrameからデータをアップロード"""
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
                existing = self.client.table('seminars').select('*').eq(
                    'event_date', seminar_data['event_date']
                ).eq(
                    'event_time', seminar_data['event_time']
                ).execute()
                
                if existing.data:
                    # 既存データを更新
                    result = self.client.table('seminars').update({
                        'participant_count': seminar_data['participant_count'],
                        'scraped_at': seminar_data['scraped_at']
                    }).eq('id', existing.data[0]['id']).execute()
                    print(f"更新: {event_date} {event_time} - 参加者数: {seminar_data['participant_count']}")
                else:
                    # 新規データを挿入
                    result = self.client.table('seminars').insert(seminar_data).execute()
                    print(f"挿入: {event_date} {event_time} - 参加者数: {seminar_data['participant_count']}")
                
                uploaded_count += 1
                
            except Exception as e:
                print(f"行 {index} のアップロードエラー: {e}")
                continue
        
        print(f"\n✅ {uploaded_count}/{len(df)}件のデータをアップロードしました")
        return uploaded_count > 0
    
    def get_all_seminars(self):
        """全てのセミナー情報を取得"""
        try:
            result = self.client.table('seminars').select('*').order('event_date').order('event_time').execute()
            return result.data
        except Exception as e:
            print(f"データ取得エラー: {e}")
            return []

def main():
    """メイン処理"""
    # CSVファイルのパスを設定
    csv_path = '/Users/hashimotoyasuhiro/Desktop/営業/result_df.csv'
    
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    
    if not os.path.exists(csv_path):
        print(f"CSVファイルが見つかりません: {csv_path}")
        return
    
    try:
        uploader = SupabaseUploader()
        print("✓ Supabase接続成功")
        
        # CSVファイルからアップロード
        if uploader.upload_from_csv(csv_path):
            print("\n📊 現在のセミナー一覧:")
            seminars = uploader.get_all_seminars()
            
            for seminar in seminars[:10]:  # 最初の10件を表示
                print(f"- {seminar['event_date']} {seminar['event_time']} - 参加者数: {seminar['participant_count']}")
            
            if len(seminars) > 10:
                print(f"... 他 {len(seminars) - 10} 件")
        
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()