# GitHub Actions セットアップガイド

## 1. GitHub Secretsの設定

GitHubリポジトリでSupabaseの認証情報を安全に保存します。

1. GitHubで `https://github.com/Yuxas-cookie/seminar` を開く
2. 「Settings」タブをクリック
3. 左メニューの「Secrets and variables」→「Actions」をクリック
4. 「New repository secret」をクリック
5. 以下のシークレットを追加：

### SUPABASE_URL
- Name: `SUPABASE_URL`
- Value: `https://fiwmedfqmhefebbhhqmv.supabase.co`

### SUPABASE_KEY
- Name: `SUPABASE_KEY`
- Value: `あなたのSupabaseサービスロールキー`

## 2. ワークフローの有効化

1. リポジトリの「Actions」タブをクリック
2. 「I understand my workflows, go ahead and enable them」をクリック（初回のみ）

## 3. 手動実行のテスト

1. 「Actions」タブで「セミナー情報スクレイピング」をクリック
2. 「Run workflow」ボタンをクリック
3. 「Run workflow」を再度クリック

## 4. 実行状況の確認

- 緑のチェック ✅ = 成功
- 赤のバツ ❌ = 失敗
- 黄色の丸 🟡 = 実行中

## 5. ログの確認

1. 実行履歴をクリック
2. 「scrape」ジョブをクリック
3. 各ステップをクリックして詳細ログを確認

## メリット

- **無料**：パブリックリポジトリなら無制限
- **メンテナンス不要**：GitHubが管理
- **自動実行**：4時間ごとに自動でスクレイピング
- **ログ保存**：実行履歴が自動保存される
- **エラー通知**：失敗時にメール通知（設定可能）

## トラブルシューティング

### エラー: "Python script failed"
- Supabaseの認証情報を確認
- Pythonスクリプトのエラーログを確認

### エラー: "Chrome failed to start"
- ワークフローファイルのChrome設定を確認

### 実行されない
- cronの時間設定を確認（UTCタイムゾーン）
- ワークフローが有効になっているか確認