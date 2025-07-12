import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// 型定義
interface UpdateResult {
  success: boolean
  added: Array<{ date: string; time: string; participants: number }>
  updated: Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>
  removed: Array<{ date: string; time: string }>
  error?: string
}

export async function POST() {
  try {
    // Pythonスクリプトのパスを構築
    const scriptPath = path.join(process.cwd(), '..', 'scraper', 'main_with_update.py')
    const pythonPath = process.env.PYTHON_PATH || '/Users/hashimotoyasuhiro/miniforge3/envs/tf29/bin/python'
    
    console.log('Pythonスクリプトを実行中:', scriptPath)
    
    // Pythonスクリプトを実行
    const { stdout, stderr } = await execAsync(`${pythonPath} ${scriptPath}`)
    
    if (stderr && !stderr.includes('[')) {
      // エラーログ以外のstderrがある場合
      console.error('Pythonスクリプトエラー:', stderr)
      throw new Error(stderr)
    }
    
    // 結果をパース
    const result: UpdateResult = JSON.parse(stdout)
    
    if (!result.success) {
      throw new Error(result.error || 'スクレイピングに失敗しました')
    }
    
    // ログ出力があれば表示
    if (stderr) {
      console.log('スクレイピングログ:', stderr)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'スクレイピング処理でエラーが発生しました',
        added: [],
        updated: [],
        removed: []
      },
      { status: 500 }
    )
  }
}