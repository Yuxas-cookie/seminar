# エキスパセミナースクレイパー プロジェクト進捗

最終更新: 2025-01-09

## プロジェクト概要
エキスパのセミナー開催情報をスクレイピングして、Supabaseに保存し、Next.jsでカレンダー表示するシステム

## 完了した作業

### 1. Pythonスクレイピング環境
- ✅ プロジェクトディレクトリ構成の作成
- ✅ requirements.txt の作成
- ✅ スクレイピングスクリプト（main.py）の解析
  - ログイン情報: sekaino.hiroshi34@gmail.com
  - スクレイピング対象: https://exp-t.jp/e/event/calendar
  - 取得データ: 日付、時間、参加者数
- ✅ CSVファイル（result_df.csv）の確認（7件のデータ）

### 2. Supabase連携
- ✅ Supabaseクライアントクラス（supabase_client.py）の作成
- ✅ CSVアップロードスクリプト（upload_to_supabase.py）の作成
- ✅ main.pyのSupabase対応版（main_updated.py）の作成

### 3. Supabaseプロジェクト（MCP経由）
- ✅ プロジェクト作成
  - 名前: calendar-app
  - ID: fiwmedfqmhefebbhhqmv
  - リージョン: ap-northeast-1（東京）
  - 組織: Yuxas-cookie's Org
  - 月額: $10
- ✅ データベーススキーマの作成
  - seminarsテーブル
  - 自動更新トリガー
  - インデックス
- ✅ データのアップロード（7件）

### 4. Next.jsカレンダーアプリ
- ✅ プロジェクト作成（calendar-app）
- ✅ 依存関係のインストール
  - @supabase/supabase-js
  - @fullcalendar/react
  - その他カレンダー関連パッケージ
- ✅ コンポーネントの作成
  - SeminarCalendar.tsx
  - Supabaseクライアント設定
- ✅ スタイリングとレイアウトの調整
- ✅ 開発サーバーの起動

## 環境変数

### Python (.env)
```
SUPABASE_URL=https://fiwmedfqmhefebbhhqmv.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd21lZGZxbWhlZmViYmhocW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMzU1ODQsImV4cCI6MjA2NzYxMTU4NH0.qoGCslHYIemQz8oC2NCRcp9UiouLsrbA_h-Vd2F12Rc
```

### Next.js (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://fiwmedfqmhefebbhhqmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd21lZGZxbWhlZmViYmhocW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMzU1ODQsImV4cCI6MjA2NzYxMTU4NH0.qoGCslHYIemQz8oC2NCRcp9UiouLsrbA_h-Vd2F12Rc
```

## アップロードされたデータ
2025年1月9日時点で7件のセミナーデータ：
- 2025-01-10 12:00 - 参加者数: 0
- 2025-01-10 20:00 - 参加者数: 1
- 2025-01-12 12:00 - 参加者数: 1
- 2025-01-13 12:00 - 参加者数: 1
- 2025-01-13 18:00 - 参加者数: 0
- 2025-01-15 12:00 - 参加者数: 0
- 2025-01-15 20:00 - 参加者数: 2

## アクセスURL
- Supabaseダッシュボード: https://supabase.com/dashboard/project/fiwmedfqmhefebbhhqmv
- カレンダーアプリ（ローカル）: http://localhost:3000

## 今後の作業予定
1. [ ] 定期的なスクレイピングの自動化（cron job）
2. [ ] セミナーの詳細情報の取得と表示
3. [ ] 認証機能の追加
4. [ ] 通知機能の実装
5. [ ] デプロイ（Vercel等）

## トラブルシューティング履歴
- CSVファイルの日付形式（MM/DD）から年を推定する処理を実装
- FullCalendarのSSR問題をdynamic importで解決
- Supabaseプロジェクト初期化の待機処理を追加

## ファイル構成
```
expertspa-scraper/
├── scraper/
│   ├── main.py                 # オリジナルスクレイピング
│   ├── main_updated.py         # Supabase対応版
│   ├── upload_to_supabase.py  # CSVアップロード
│   └── supabase_client.py     # Supabaseクライアント
├── calendar-app/              # Next.jsアプリ
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   └── SeminarCalendar.tsx
│   │   └── lib/
│   │       └── supabase.ts
│   └── .env.local
├── supabase/
│   └── schema.sql
├── .env
├── .gitignore
├── requirements.txt
├── README.md
└── README_FULL.md
```