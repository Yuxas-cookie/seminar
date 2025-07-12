# エキスパ セミナーカレンダー & スクレイパー

セミナー情報をスクレイピングして表示・管理するカレンダーアプリケーションです。

## 機能

- セミナー情報の自動スクレイピング
- カレンダー表示
- スタッフ管理（並び順付き）
- 入れない日の管理（スタッフ別）
- セミナー情報の自動更新（4時間ごと）
- 物理削除による実行日以降のデータ管理
- 詳細なログ出力
- レスポンシブデザイン対応

## プロジェクト構成

```
expertspa-scraper/
├── scraper/                    # Pythonスクレイピングスクリプト
│   ├── main_with_update.py     # メインスクレイピングスクリプト（物理削除対応）
│   └── ...
├── calendar-app/               # Next.jsカレンダーアプリ
│   ├── src/
│   ├── supabase/
│   │   └── functions/         # Edge Functions
│   └── ...
├── cron_script.sh             # ローカルcron実行用スクリプト
├── DEPLOYMENT_GUIDE.md        # デプロイメントガイド
└── SUPABASE_CRON_GUIDE.md     # Supabase定期実行ガイド
```

## セットアップ

### 1. 環境準備

```bash
# リポジトリのクローン
git clone https://github.com/Yuxas-cookie/seminar.git
cd seminar

# Python仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Mac/Linux

# Python依存関係のインストール
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env` ファイルを作成：

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Python実行パス
PYTHON_PATH=/Users/hashimotoyasuhiro/miniforge3/envs/tf29/bin/python

# スクレイピング認証情報
SCRAPING_EMAIL=your_email
SCRAPING_PASSWORD=your_password
```

### 3. Webアプリのセットアップ

```bash
cd calendar-app
npm install
npm run dev
```

## 使用方法

### 手動実行

1. **Pythonスクリプト直接実行**:
```bash
python scraper/main_with_update.py
```

2. **Webアプリから実行**:
- ブラウザで `http://localhost:3000` を開く
- 右上の「データを更新」ボタンをクリック

### 自動実行（Supabase）

Supabase Edge FunctionsとPg_cronで4時間ごとに自動実行されます。
詳細は `SUPABASE_CRON_GUIDE.md` を参照。

### ローカルcron設定

```bash
# crontabに追加
crontab -e
# 4時間ごとに実行
0 */4 * * * /path/to/expertspa-scraper/cron_script.sh
```

## 技術スタック

- **スクレイピング**: Python, Selenium, BeautifulSoup
- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS v4
- **データベース**: Supabase
- **定期実行**: Supabase Edge Functions, pg_cron
- **UI**: Radix UI, Framer Motion
- **カレンダー**: FullCalendar

## 主な機能の詳細

### 物理削除による更新

- 実行日以降の日程で、スクレイピング結果に存在しないセミナーは完全に削除
- 過去の日程は保持される
- 変更内容は全てログに出力

### ログ出力

スクリプト実行時に以下のログが出力されます：
- `[新規追加]` - 新しいセミナー
- `[更新]` - 参加者数の変更
- `[削除]` - 削除されたセミナー
- `[情報]` - 変更なし

## トラブルシューティング

詳細は各ガイドを参照：
- `DEPLOYMENT_GUIDE.md` - デプロイメント関連
- `SUPABASE_CRON_GUIDE.md` - Supabase定期実行関連

## 注意事項

- スクレイピングは相手サーバーに負荷をかけないよう配慮してください
- 取得したデータの使用については、エキスパの利用規約に従ってください