# GitHubリポジトリへのプッシュ手順

## 1. GitHubでリポジトリを作成

1. https://github.com/new にアクセス
2. リポジトリ名: `expertspa-scraper`
3. プライベートリポジトリとして作成
4. READMEなどは追加しない（既にあるため）

## 2. リモートリポジトリを追加

作成後、以下のコマンドを実行：

```bash
# リモートリポジトリを追加（YOUR_USERNAMEを自分のGitHubユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/expertspa-scraper.git

# ブランチ名をmainに設定
git branch -M main

# プッシュ
git push -u origin main
```

## 3. 認証

GitHubのユーザー名とパスワード（またはPersonal Access Token）を入力

## 完了

これで全ての変更がGitHubにプッシュされます。

## 今回コミットした内容

- スクレイピング処理の物理削除実装
- 実行日以降の日程のみ削除する処理
- 詳細なログ出力
- Webアプリとの統合（更新ボタン）
- Supabase Edge Functionのデプロイ
- pg_cronによる4時間ごとの定期実行設定
- ローカルcronスクリプト
- 各種ドキュメント