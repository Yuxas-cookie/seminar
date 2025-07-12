# Python スクレイピングサーバーのオプション

Edge FunctionはJavaScriptのみをサポートし、Seleniumのような動的なブラウザ操作ができないため、以下の代替案を提案します：

## オプション 1: Render.com（推奨）

無料プランでPythonアプリをホストできます。

### セットアップ手順：

1. [Render.com](https://render.com)でアカウントを作成
2. 新しいWeb Serviceを作成
3. GitHubリポジトリを接続
4. 以下の設定を使用：
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python app.py`

### 必要なファイル：

**app.py:**
```python
from flask import Flask, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/scrape', methods=['POST'])
def scrape():
    try:
        # main_with_update.pyを実行
        result = subprocess.run(
            ['python', 'scraper/main_with_update.py'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return jsonify(json.loads(result.stdout))
        else:
            return jsonify({
                'success': False,
                'error': result.stderr,
                'added': [],
                'updated': [],
                'removed': []
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'added': [],
            'updated': [],
            'removed': []
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
```

**requirements.txt:**
```
flask
selenium
beautifulsoup4
pandas
tqdm
python-dotenv
supabase
chromedriver-binary
```

## オプション 2: Railway.app

似たような無料プランを提供：

1. [Railway.app](https://railway.app)でアカウントを作成
2. GitHubからデプロイ
3. 環境変数を設定
4. 自動的にビルドとデプロイ

## オプション 3: Google Cloud Run

より信頼性が高く、月間の無料枠があります：

1. Dockerfileを作成
2. Google Cloud Runにデプロイ
3. HTTPエンドポイントを取得

**Dockerfile:**
```dockerfile
FROM python:3.9-slim

# Chrome依存関係をインストール
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

## Edge Functionの更新

外部サーバーをセットアップしたら、Edge Functionを以下のように更新：

```typescript
const scraperUrl = Deno.env.get('PYTHON_SCRAPER_URL') || 'https://your-app.onrender.com/scrape'

const scraperResponse = await fetch(scraperUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})

const result = await scraperResponse.json()
```

## 推奨事項

1. **Render.com**が最も簡単で、無料プランで十分です
2. セキュリティのため、APIキーを使用して認証を追加
3. 定期実行は引き続きpg_cronを使用

どのオプションを選びますか？