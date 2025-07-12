# Supabase定期実行セットアップガイド

## 概要

Supabase Edge Functionsとpg_cronを使用して、セミナー情報のスクレイピングを定期的に実行します。

## セットアップ手順

### 1. Supabase CLIのインストール

```bash
# macOS/Linux
brew install supabase/tap/supabase

# または npm
npm install -g supabase
```

### 2. プロジェクトのリンク

```bash
cd calendar-app
supabase link --project-ref YOUR_PROJECT_ID
```

### 3. Edge Functionのデプロイ

```bash
# Edge Functionをデプロイ
supabase functions deploy scrape-seminars

# 環境変数を設定（必要な場合）
supabase secrets set SCRAPING_EMAIL=your_email@example.com
supabase secrets set SCRAPING_PASSWORD=your_password
```

### 4. pg_cronの設定

1. Supabaseダッシュボードで「SQL Editor」を開く

2. 以下のSQLを実行してプロジェクトIDとサービスロールキーを設定：

```sql
-- プロジェクトIDとサービスロールキーを設定
-- YOUR_PROJECT_IDとYOUR_SERVICE_ROLE_KEYを実際の値に置き換えてください
ALTER DATABASE postgres SET "app.settings.project_id" = 'YOUR_PROJECT_ID';
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
```

3. マイグレーションファイルを修正：

`supabase/migrations/20240101000000_setup_cron_job.sql`のYOUR_PROJECT_IDを実際の値に置き換える

4. マイグレーションを実行：

```bash
supabase db push
```

## 動作確認

### Edge Functionの手動実行

```bash
# CLIから実行
supabase functions invoke scrape-seminars

# またはcurlで実行
curl -i --location --request POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/scrape-seminars' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

### cronジョブの確認

SQLエディタで以下を実行：

```sql
-- 登録されているcronジョブを確認
SELECT * FROM cron_job_status;

-- 実行履歴を確認
SELECT * FROM cron_job_runs;

-- 手動でcronジョブを実行（テスト用）
SELECT cron.schedule(
  'test-scrape',
  '* * * * *',  -- 1分ごと（テスト用）
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/scrape-seminars',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- テストが終わったら削除
SELECT cron.unschedule('test-scrape');
```

## スケジュールの変更

デフォルトでは毎日午前6時（JST）に実行されます。変更する場合：

```sql
-- 既存のジョブを削除
SELECT cron.unschedule('scrape-seminars-daily');

-- 新しいスケジュールで再登録（例：1日2回、6時と18時）
SELECT cron.schedule(
  'scrape-seminars-twice-daily',
  '0 21,9 * * *',  -- UTC 21:00, 9:00 = JST 6:00, 18:00
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/scrape-seminars',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## トラブルシューティング

### pg_cronが有効になっていない

Supabaseダッシュボードで「Database」→「Extensions」から`pg_cron`を有効化してください。

### Edge Functionが実行されない

1. Function logsを確認：
```bash
supabase functions logs scrape-seminars
```

2. 権限を確認：
- サービスロールキーが正しく設定されているか
- Edge FunctionがSupabaseにアクセスできるか

### cronジョブが実行されない

1. `cron.job_run_details`テーブルでエラーを確認
2. `net.http_post`の権限を確認
3. データベース設定（project_id, service_role_key）が正しいか確認

## 注意事項

- pg_cronはUTCで動作します。日本時間への変換に注意してください
- サービスロールキーは機密情報です。安全に管理してください
- Edge Functionの実行には料金が発生する場合があります