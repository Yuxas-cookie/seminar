# GitHubリポジトリの作成とプッシュ

リポジトリがまだ存在しないため、以下の手順で作成してください：

## 方法1: GitHub Webサイトで作成

1. https://github.com/new にアクセス
2. 以下の設定でリポジトリを作成：
   - Repository name: `expertspa-scraper`
   - Description: "Expertspa seminar scraper with scheduled execution"
   - Private repository を選択
   - **重要**: "Initialize this repository with:" のチェックボックスは全て外す

3. 作成後、ターミナルで以下を実行：

```bash
cd /Users/hashimotoyasuhiro/Desktop/営業/expertspa-scraper
git push -u origin main
```

## 方法2: GitHub CLIを使用（推奨）

1. GitHub CLIをインストール：
```bash
brew install gh
```

2. 認証：
```bash
gh auth login
```

3. リポジトリを作成してプッシュ：
```bash
gh repo create expertspa-scraper --private --source=. --remote=origin --push
```

## 既にリモートが設定済みの場合

もし上記の方法でエラーが出る場合：

```bash
# 既存のリモートを削除
git remote remove origin

# 新しくリモートを追加
git remote add origin https://github.com/yuxas/expertspa-scraper.git

# プッシュ
git push -u origin main
```

## 認証について

プッシュ時にユーザー名とパスワードを求められた場合：
- Username: yuxas
- Password: GitHubのPersonal Access Token（パスワードではなくトークンを使用）

Personal Access Tokenの作成：
1. https://github.com/settings/tokens/new
2. "repo" スコープを選択
3. トークンを生成してパスワードの代わりに使用