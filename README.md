# エキスパ セミナースクレイパー

エキスパのセミナー開催情報をスクレイピングして、Supabaseに保存するPythonアプリケーションです。

## 機能

- エキスパのセミナー情報を自動取得
- Supabaseデータベースへの保存
- 重複チェック機能
- セミナー情報の管理（タイトル、日時、場所、講師、参加費など）

## セットアップ

### 1. 環境準備

```bash
# リポジトリのクローン（またはファイルをコピー）
cd expertspa-scraper

# Python仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Mac/Linux
# または
venv\Scripts\activate  # Windows

# セットアップスクリプトの実行
python setup.py
```

### 2. ChromeDriverのインストール

**Mac:**
```bash
brew install chromedriver
```

**その他:**
[ChromeDriver公式サイト](https://chromedriver.chromium.org/)からダウンロード

### 3. Supabaseの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで `supabase/schema.sql` の内容を実行
3. プロジェクトのURLとAnon Keyを取得
4. `.env` ファイルに設定を記入

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
```

## 使用方法

### スクレイピングの実行

```bash
python scraper/main.py
```

### 接続テスト

```bash
python scraper/main.py test
```

### 定期実行（cron）

```bash
# crontabに追加（毎日午前9時に実行）
0 9 * * * cd /path/to/expertspa-scraper && /path/to/venv/bin/python scraper/main.py >> logs/scraping.log 2>&1
```

## プロジェクト構成

```
expertspa-scraper/
├── scraper/
│   ├── main.py              # メインスクリプト
│   ├── expertspa_scraper.py # スクレイピングロジック
│   └── supabase_client.py   # Supabase接続
├── supabase/
│   └── schema.sql           # データベーススキーマ
├── config/                  # 設定ファイル
├── logs/                    # ログファイル
├── requirements.txt         # Python依存関係
├── setup.py                # セットアップスクリプト
└── .env                    # 環境変数（gitignore推奨）
```

## データベーススキーマ

### seminarsテーブル

| カラム名 | 型 | 説明 |
|---------|------|------|
| id | UUID | 主キー |
| title | VARCHAR(255) | セミナータイトル |
| description | TEXT | 説明文 |
| event_date | DATE | 開催日 |
| event_time | TIME | 開催時刻 |
| location | VARCHAR(255) | 開催場所 |
| url | VARCHAR(500) | 詳細URL |
| presenter | VARCHAR(255) | 講師名 |
| capacity | INTEGER | 定員 |
| fee | INTEGER | 参加費（円） |
| status | VARCHAR(50) | ステータス |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |
| scraped_at | TIMESTAMP | スクレイピング日時 |

## トラブルシューティング

### ChromeDriverエラー
- Chromeブラウザのバージョンと ChromeDriverのバージョンが一致しているか確認
- PATHに ChromeDriverが含まれているか確認

### Supabase接続エラー
- .envファイルの設定を確認
- Supabaseプロジェクトが稼働しているか確認
- ネットワーク接続を確認

### スクレイピングでデータが取得できない
- エキスパのサイト構造が変更されている可能性
- `scraper/expertspa_scraper.py` のセレクタを更新する必要があるかも

## 注意事項

- スクレイピングは相手サーバーに負荷をかけないよう、適度な間隔で実行してください
- robots.txtを確認し、サイトの利用規約を遵守してください
- 取得したデータの使用については、エキスパの利用規約に従ってください