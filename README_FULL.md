# エキスパ セミナースクレイパー & カレンダーアプリ

エキスパのセミナー開催情報をスクレイピングして、Supabaseに保存し、カレンダー表示するフルスタックアプリケーションです。

## 構成

```
expertspa-scraper/
├── scraper/                 # Pythonスクレイピング
│   ├── main.py             # オリジナルスクリプト
│   ├── main_updated.py     # Supabase連携版
│   ├── upload_to_supabase.py # CSVアップロードツール
│   └── supabase_client.py  # Supabase接続クラス
├── calendar-app/           # Next.jsカレンダーアプリ
│   ├── src/
│   │   ├── app/           # アプリケーションページ
│   │   ├── components/    # Reactコンポーネント
│   │   └── lib/           # ユーティリティ
│   └── package.json
├── supabase/
│   └── schema.sql         # データベーススキーマ
└── requirements.txt       # Python依存関係
```

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. SQL Editorで以下を実行：

```sql
-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- スキーマの実行
-- supabase/schema.sql の内容をコピー&ペースト
```

4. プロジェクト設定から以下を取得：
   - Project URL
   - Anon Key

### 2. Pythonスクレイピングのセットアップ

```bash
# Python環境の作成
python -m venv venv
source venv/bin/activate  # Mac/Linux
# または
venv\Scripts\activate  # Windows

# 依存関係のインストール
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してSupabase情報を設定
```

### 3. スクレイピングの実行

#### 方法1: CSVファイルからアップロード
```bash
# 既存のCSVファイルをSupabaseにアップロード
python scraper/upload_to_supabase.py /Users/hashimotoyasuhiro/Desktop/営業/result_df.csv
```

#### 方法2: スクレイピングと同時にアップロード
```bash
# main_updated.pyを使用（.envファイルが必要）
python scraper/main_updated.py
```

### 4. カレンダーアプリのセットアップ

```bash
cd calendar-app

# 環境変数の設定
cp .env.local.example .env.local
# .env.localを編集してSupabase情報を設定

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 環境変数

### Python (.env)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
```

### Next.js (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 機能

### Pythonスクレイピング
- エキスパのセミナー情報を自動取得
- CSVファイルへの保存
- Supabaseへの直接アップロード
- 重複チェック機能

### カレンダーアプリ
- 月/週/日表示
- セミナー参加者数の可視化
- 統計情報の表示
- レスポンシブデザイン

## データ構造

### seminarsテーブル
```sql
- id: UUID (主キー)
- event_date: DATE (開催日)
- event_time: TIME (開催時刻)
- participant_count: INTEGER (参加者数)
- year: INTEGER (年)
- month: INTEGER (月)
- day: INTEGER (日)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- scraped_at: TIMESTAMP (スクレイピング日時)
```

## トラブルシューティング

### Supabase接続エラー
- .envファイルの設定を確認
- Supabaseプロジェクトが稼働しているか確認

### カレンダーが表示されない
- ブラウザのコンソールでエラーを確認
- .env.localの設定を確認
- Supabaseのテーブルにデータが存在するか確認

### ChromeDriverエラー
```bash
# Mac
brew install chromedriver

# または
pip install chromedriver-binary
```

## 今後の拡張案

1. **認証機能**: Supabase Authを使用したユーザー認証
2. **リアルタイム更新**: Supabase Realtimeでのライブアップデート
3. **通知機能**: セミナー開催前の通知
4. **詳細情報**: セミナーの詳細情報の取得と表示
5. **エクスポート機能**: カレンダーデータのエクスポート

## 注意事項

- スクレイピングは相手サーバーに負荷をかけないよう適度な間隔で実行
- ログイン情報は環境変数で管理し、コードに直接記載しない
- 取得したデータの使用は利用規約に従う