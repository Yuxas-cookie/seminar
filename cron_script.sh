#!/bin/bash

# スクリプトのディレクトリに移動
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 環境変数の読み込み
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Pythonパスを設定
PYTHON_PATH="${PYTHON_PATH:-/Users/hashimotoyasuhiro/miniforge3/envs/tf29/bin/python}"

# ログファイルのパス
LOG_FILE="$SCRIPT_DIR/logs/cron_$(date +%Y%m%d).log"
mkdir -p "$SCRIPT_DIR/logs"

# タイムスタンプを追加してログに記録
echo "===========================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] スクレイピング開始" >> "$LOG_FILE"

# Pythonスクリプトを実行
$PYTHON_PATH "$SCRIPT_DIR/scraper/main_with_update.py" >> "$LOG_FILE" 2>&1

# 実行結果をチェック
if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] スクレイピング成功" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] スクレイピング失敗" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"