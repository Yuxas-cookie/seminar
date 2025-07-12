# デプロイメントガイド

## スクレイピング処理の実行方法

このプロジェクトでは、同じスクレイピング処理を以下の2つの方法で実行できます：

1. **Webアプリの更新ボタンから手動実行**
2. **cronによる定期自動実行**

両方とも`scraper/main_with_update.py`を使用し、以下の処理を行います：

- 新規セミナーの追加
- 既存セミナーの参加者数更新
- 実行日以降の日程で、スクレイピング結果にないセミナーの物理削除
- 過去の日程は保持

## 1. Webアプリからの手動実行

### セットアップ

1. Webアプリの環境変数を設定：
```bash
cd calendar-app
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

2. 依存関係のインストール：
```bash
npm install
```

3. 開発サーバーの起動：
```bash
npm run dev
```

4. ブラウザで `http://localhost:3000` を開く

5. 画面右上の「データを更新」ボタンをクリック

### 注意事項

- APIルートは `/api/scrape` でPythonスクリプトを実行します
- Python実行パスは環境変数 `PYTHON_PATH` で設定可能
- デフォルトは `/Users/hashimotoyasuhiro/miniforge3/envs/tf29/bin/python`

## 2. cronによる定期実行

### セットアップ

1. 環境変数ファイルの作成：
```bash
cp .env.example .env
# .envファイルを編集してSupabase接続情報を設定
```

2. crontabの設定：
```bash
# crontabを編集
crontab -e

# 以下の行を追加（毎日午前6時に実行する例）
0 6 * * * /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/cron_script.sh
```

### cron設定例

```bash
# 毎日午前6時に実行
0 6 * * * /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/cron_script.sh

# 毎日午前6時と午後6時に実行（1日2回）
0 6,18 * * * /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/cron_script.sh

# 平日（月-金）の午前9時に実行
0 9 * * 1-5 /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/cron_script.sh

# 4時間ごとに実行
0 */4 * * * /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/cron_script.sh
```

### ログの確認

cronで実行されたログは以下のディレクトリに保存されます：
```
/Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper/logs/
```

ログファイル名は `cron_YYYYMMDD.log` の形式です。

## トラブルシューティング

### Pythonスクリプトが見つからない

`.env` ファイルで正しいPythonパスを設定してください：
```
PYTHON_PATH=/path/to/your/python
```

### Supabase接続エラー

`.env` ファイルに正しい接続情報を設定してください：
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### cronが動作しない

1. cronサービスが有効か確認：
```bash
sudo launchctl list | grep cron
```

2. cron_script.shに実行権限があるか確認：
```bash
ls -la cron_script.sh
# 実行権限がない場合：
chmod +x cron_script.sh
```

3. crontabが正しく設定されているか確認：
```bash
crontab -l
```