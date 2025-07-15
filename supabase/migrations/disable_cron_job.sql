-- Supabaseのpg_cronジョブを無効化するスクリプト
-- 実行方法：Supabaseダッシュボード > SQL Editor でこのクエリを実行

-- 1. 既存のcronジョブを確認
SELECT 
    jobname, 
    schedule, 
    active,
    created_at
FROM cron.job 
WHERE jobname = 'auto-update-seminars';

-- 2. cronジョブを無効化（削除）
SELECT cron.unschedule('auto-update-seminars');

-- 3. 削除確認
SELECT 
    jobname, 
    schedule, 
    active,
    created_at
FROM cron.job 
WHERE jobname = 'auto-update-seminars';

-- 注意：
-- このスクリプトを実行後、定期実行はGitHub Actionsのみになります
-- 手動実行（更新ボタン）は引き続き利用可能です