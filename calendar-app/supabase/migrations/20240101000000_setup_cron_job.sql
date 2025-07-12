-- pg_cronエクステンションを有効化（すでに有効な場合はスキップ）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のcronジョブを削除（存在する場合）
SELECT cron.unschedule('scrape-seminars-daily');

-- 毎日午前6時（JST）にスクレイピングを実行
-- 注意: pg_cronはUTCで動作するため、日本時間の6時はUTC21時
SELECT cron.schedule(
  'scrape-seminars-daily',
  '0 21 * * *',  -- UTC 21:00 = JST 6:00
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

-- コメント: cronジョブの説明
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';

-- 実行履歴を確認するためのビューを作成
CREATE OR REPLACE VIEW cron_job_status AS
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  username,
  database,
  command
FROM cron.job
WHERE jobname = 'scrape-seminars-daily';

-- 実行ログを確認するためのビューを作成
CREATE OR REPLACE VIEW cron_job_runs AS
SELECT 
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'scrape-seminars-daily')
ORDER BY start_time DESC
LIMIT 100;