# GitHub Personal Access Token 設定ガイド

更新ボタンからGitHub Actionsを実行するために、GitHub Personal Access Tokenが必要です。

## 1. GitHub Personal Access Tokenの作成

1. GitHubにログイン
2. 右上のプロフィールアイコン → Settings
3. 左メニューの一番下「Developer settings」をクリック
4. 「Personal access tokens」→「Tokens (classic)」をクリック
5. 「Generate new token」→「Generate new token (classic)」をクリック
6. 以下を設定：
   - **Note**: `Seminar Scraper Token`（任意の名前）
   - **Expiration**: `90 days`または`No expiration`
   - **Scopes**: 以下にチェック
     - ✅ `repo`（全体）
     - ✅ `workflow`
7. 「Generate token」をクリック
8. **表示されたトークンをコピー**（この画面を閉じると二度と見れません！）

## 2. Vercelに環境変数を設定

### Vercelダッシュボードで設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」タブ → 「Environment Variables」
4. 以下を追加：
   - **Name**: `GITHUB_TOKEN`
   - **Value**: コピーしたGitHub Personal Access Token
   - **Environment**: Production、Preview、Development全てにチェック
5. 「Save」をクリック

### または、Vercel CLIで設定

```bash
vercel env add GITHUB_TOKEN
```

## 3. ローカル開発環境の設定

`.env.local`ファイルに追加：

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. 動作確認

1. Webアプリの「データを更新」ボタンをクリック
2. コンソールに「GitHub Actionsワークフローが開始されました」と表示される
3. GitHubの「Actions」タブで実行状況を確認

## トークンの権限について

- `repo`: リポジトリへのアクセス（ワークフロー実行に必要）
- `workflow`: GitHub Actionsワークフローの実行権限

## セキュリティ注意事項

- トークンは**絶対に**公開しない
- `.env.local`は`.gitignore`に含まれていることを確認
- トークンが漏洩した場合は、即座に無効化して新しいトークンを作成

## トラブルシューティング

### エラー: "GitHub認証トークンが設定されていません"
→ Vercelの環境変数設定を確認

### エラー: "GitHub API エラー: 401"
→ トークンの権限を確認（`repo`と`workflow`が必要）

### エラー: "GitHub API エラー: 404"
→ リポジトリ名やワークフローファイル名を確認