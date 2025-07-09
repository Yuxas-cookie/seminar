# 環境変数デバッグガイド

## コンソールで確認すべきログ

ブラウザの開発者ツール（Console）で以下のログを確認してください：

### 1. Supabase Environment Variables Check
```
=== Supabase Environment Variables Check ===
NEXT_PUBLIC_SUPABASE_URL: https://fiwmedfqmhefebbhhqmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅ 設定済み (eyJhbGciOiJIUzI1NiI...)
==========================================
```

### 2. Client-side Environment Check
```
=== Client-side Environment Check ===
NODE_ENV: production
NEXT_PUBLIC_SUPABASE_URL: https://fiwmedfqmhefebbhhqmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅ 設定済み
====================================
```

## エラーの場合

もし以下のようなログが表示される場合：
```
NEXT_PUBLIC_SUPABASE_URL: ❌ 未設定
NEXT_PUBLIC_SUPABASE_ANON_KEY: ❌ 未設定
```

## Vercelでの環境変数設定手順

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下を追加（コピペ推奨）：

### NEXT_PUBLIC_SUPABASE_URL
```
https://fiwmedfqmhefebbhhqmv.supabase.co
```

### NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd21lZGZxbWhlZmViYmhocW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDM5MjUsImV4cCI6MjA2NzYxOTkyNX0.gLJFdCXDhFH5I8WS2qKvhO6I-mJBRXk8aJgb_m6p3Ic
```

### SCRAPING_EMAIL
```
sekaino.hiroshi34@gmail.com
```

### SCRAPING_PASSWORD
```
h31503150h
```

5. すべての環境（Production, Preview, Development）にチェック
6. Save
7. プロジェクトを再デプロイ

## 注意事項

- 環境変数名は大文字小文字を正確に
- 値の前後にスペースを入れない
- クォーテーションを含めない
- `NEXT_PUBLIC_` プレフィックスが必要（クライアントサイドで使用するため）