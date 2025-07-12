# Pythonスクリプトの使用推奨

## 現状の問題

Edge Functionでのスクレイピングには以下の制限があります：

1. **認証の問題**
   - POSTログインが正しく機能しない
   - セッション/クッキー管理が困難
   - リダイレクトの適切な処理ができない

2. **動的コンテンツの問題**
   - JavaScriptで生成されるコンテンツを取得できない
   - Seleniumのようなブラウザエンジンが使えない

3. **結果**
   - セミナーデータが0件しか取得できない
   - 既存データが全て削除されてしまう

## 推奨する解決方法

### 1. Pythonスクリプトの定期実行（推奨）

```bash
# cronで4時間ごとに実行
0 */4 * * * cd /path/to/expertspa-scraper && python scraper/main_with_update.py
```

### 2. GitHub Actionsを使用

`.github/workflows/scrape.yml`:
```yaml
name: Scrape Seminars

on:
  schedule:
    - cron: '0 */4 * * *'  # 4時間ごと
  workflow_dispatch:  # 手動実行も可能

jobs:
  scrape:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install Chrome
      run: |
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        echo "deb http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee -a /etc/apt/sources.list.d/google-chrome.list
        sudo apt-get update
        sudo apt-get install google-chrome-stable
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
    
    - name: Run scraper
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      run: |
        python scraper/main_with_update.py
```

### 3. 外部サーバーでPython APIを立てる

Render.comなどで以下のようなAPIを作成：

```python
from flask import Flask, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/scrape', methods=['POST'])
def scrape():
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
            'error': result.stderr
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
```

## 暫定対策

Edge Functionの削除ロジックを無効化して、データの消失を防ぐ：

```typescript
// 削除処理を一時的に無効化
if (false && eventDate >= today && !currentSeminars.has(key)) {
  // 削除処理
}
```

## まとめ

- **Edge Functionは静的なAPIには適しているが、認証が必要な動的サイトのスクレイピングには不向き**
- **Pythonスクリプトを使い続けることを強く推奨**
- **自動化はGitHub ActionsやCronジョブで実現可能**