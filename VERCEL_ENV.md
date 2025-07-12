# Vercel環境変数設定ガイド

VercelでWebアプリをデプロイする際に必要な環境変数です。

## 必須の環境変数

Vercelのダッシュボードで以下の環境変数を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=https://fiwmedfqmhefebbhhqmv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd21lZGZxbWhlZmViYmhocW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMzU1ODQsImV4cCI6MjA2NzYxMTU4NH0.qoGCslHYIemQz8oC2NCRcp9UiouLsrbA_h-Vd2F12Rc
```

## 設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」タブを開く
4. 「Environment Variables」セクションに移動
5. 上記の環境変数を追加
6. 「Save」をクリック
7. 再デプロイ

## 注意事項

- `NEXT_PUBLIC_`プレフィックスは必須です（クライアントサイドでも使用するため）
- Python関連の環境変数は不要です（Supabase Edge Functionを使用）
- スクレイピング認証情報はSupabase Edge Function内にハードコードされています

## 動作確認

環境変数設定後、Webアプリの「データを更新」ボタンをクリックして動作確認してください。