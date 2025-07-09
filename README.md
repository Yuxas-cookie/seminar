# エキスパ セミナーカレンダー

セミナー情報をスクレイピングして表示・管理するカレンダーアプリケーションです。

## 機能

- セミナー情報のカレンダー表示
- スタッフ管理（並び順付き）
- 入れない日の管理（スタッフ別）
- セミナー情報の自動更新（4時間ごと）
- レスポンシブデザイン対応

## 環境変数

Vercelでデプロイする際は、以下の環境変数を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SCRAPING_EMAIL=your_scraping_email
SCRAPING_PASSWORD=your_scraping_password
```

## 技術スタック

- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS v4
- **データベース**: Supabase
- **UI**: Radix UI, Framer Motion
- **カレンダー**: FullCalendar
- **スクレイピング**: Node.js (fetch API)

## Getting Started

開発サーバーの起動:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いて確認してください。

## ビルド

```bash
npm run build
```

## デプロイ

1. GitHubにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## Supabase Edge Functions

自動更新用のEdge Functionは `supabase/functions/auto-update-seminars` にあります。
4時間ごとに自動実行されるよう設定されています。