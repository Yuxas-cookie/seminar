# Supabase Edge Function 環境変数設定

## Edge Functionの環境変数設定

Edge Functionでスクレイピング認証情報を使用するため、環境変数を設定します。

### 方法1: Supabase CLIを使用

```bash
# Supabase CLIがインストールされていない場合
npm install -g supabase

# プロジェクトにリンク
cd calendar-app
supabase link --project-ref fiwmedfqmhefebbhhqmv

# 環境変数を設定
supabase secrets set SCRAPING_EMAIL=sekaino.hiroshi34@gmail.com
supabase secrets set SCRAPING_PASSWORD=h31503150h
```

### 方法2: Supabaseダッシュボードから設定

1. https://app.supabase.com/project/fiwmedfqmhefebbhhqmv にアクセス
2. 左メニューの「Edge Functions」を選択
3. 「Secrets」タブを開く
4. 以下の環境変数を追加：
   - `SCRAPING_EMAIL`: sekaino.hiroshi34@gmail.com
   - `SCRAPING_PASSWORD`: h31503150h

### 環境変数の確認

設定後、以下のコマンドで確認できます：

```bash
supabase secrets list
```

### Edge Functionの再デプロイ

環境変数設定後、Edge Functionを再デプロイする必要がある場合：

```bash
supabase functions deploy scrape-seminars
```

## トラブルシューティング

### Edge Functionのログを確認

```bash
supabase functions logs scrape-seminars --tail
```

### 手動でEdge Functionをテスト

```bash
supabase functions invoke scrape-seminars
```

または

```bash
curl -i --location --request POST \
  'https://fiwmedfqmhefebbhhqmv.supabase.co/functions/v1/scrape-seminars' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd21lZGZxbWhlZmViYmhocW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMzU1ODQsImV4cCI6MjA2NzYxMTU4NH0.qoGCslHYIemQz8oC2NCRcp9UiouLsrbA_h-Vd2F12Rc' \
  --header 'Content-Type: application/json' \
  --data '{}'
```