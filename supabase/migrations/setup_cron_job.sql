-- pg_cron拡張を有効化（Supabaseダッシュボードで実行）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のジョブを削除（存在する場合）
SELECT cron.unschedule('auto-update-seminars');

-- 4時間ごとに実行するジョブを作成
-- 0時、4時、8時、12時、16時、20時に実行
SELECT cron.schedule(
  'auto-update-seminars',
  '0 */4 * * *', -- 4時間ごと
  $$
  SELECT
    net.http_post(
      url := 'https://fiwmedfqmhefebbhhqmv.supabase.co/functions/v1/auto-update-seminars',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('source', 'cron')
    );
  $$
);

-- ジョブの確認
SELECT * FROM cron.job WHERE jobname = 'auto-update-seminars';