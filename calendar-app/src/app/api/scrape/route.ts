import { NextResponse } from 'next/server'

// 型定義
interface UpdateResult {
  success: boolean
  added: Array<{ date: string; time: string; participants: number }>
  updated: Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>
  removed: Array<{ date: string; time: string }>
  error?: string
}

interface GitHubWorkflowResponse {
  status: string
  message?: string
  workflow_run?: {
    id: number
    html_url: string
    status: string
  }
}

export async function POST() {
  try {
    // GitHub Personal Access Tokenを環境変数から取得
    const githubToken = process.env.GITHUB_TOKEN
    const owner = 'Yuxas-cookie'
    const repo = 'seminar'
    const workflowFileName = 'scrape-seminars.yml'

    if (!githubToken) {
      throw new Error('GitHub認証トークンが設定されていません')
    }

    console.log('GitHub Actionsワークフローを実行中...')

    // GitHub Actions APIを使ってワークフローを手動実行
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFileName}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main' // mainブランチで実行
        })
      }
    )

    if (response.status === 204) {
      // 成功（204 No Content）
      console.log('GitHub Actionsワークフローが開始されました')
      
      // ワークフロー実行の詳細を取得（少し待ってから）
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const runsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${githubToken}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      )
      
      let workflowRun = null
      if (runsResponse.ok) {
        const runsData = await runsResponse.json()
        if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
          workflowRun = runsData.workflow_runs[0]
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'スクレイピングを開始しました。GitHub Actionsで処理中です。',
        workflow_run: workflowRun ? {
          id: workflowRun.id,
          html_url: workflowRun.html_url,
          status: workflowRun.status
        } : undefined,
        added: [],
        updated: [],
        removed: []
      })
    } else {
      const errorData = await response.json()
      console.error('GitHub API エラー:', errorData)
      throw new Error(`GitHub API エラー: ${response.status} - ${errorData.message || 'Unknown error'}`)
    }
    
  } catch (error) {
    console.error('Scraping error:', error)
    
    // エラーが発生した場合は、Edge Functionにフォールバック
    console.log('GitHub Actions実行に失敗。Edge Functionにフォールバック...')
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase設定が不完全です')
      }

      // Supabase Edge Functionを呼び出し（フォールバック）
      const response = await fetch(`${supabaseUrl}/functions/v1/scrape-seminars`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Edge Function エラー:', errorText)
        throw new Error(`Edge Function エラー: ${response.status}`)
      }

      const result: UpdateResult = await response.json()
      
      return NextResponse.json({
        ...result,
        message: 'Edge Function (フォールバック) で実行しました'
      })
      
    } catch (fallbackError) {
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
}