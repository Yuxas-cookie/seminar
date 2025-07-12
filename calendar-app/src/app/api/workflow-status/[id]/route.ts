import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const githubToken = process.env.GITHUB_TOKEN
    const owner = 'Yuxas-cookie'
    const repo = 'seminar'
    const runId = params.id

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub認証トークンが設定されていません' },
        { status: 500 }
      )
    }

    // ワークフロー実行の詳細を取得
    const runResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    if (!runResponse.ok) {
      return NextResponse.json(
        { error: 'ワークフロー情報の取得に失敗しました' },
        { status: runResponse.status }
      )
    }

    const runData = await runResponse.json()

    // ジョブの詳細を取得
    const jobsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    let steps: any[] = []
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json()
      if (jobsData.jobs && jobsData.jobs.length > 0) {
        // 最初のジョブのステップを取得
        steps = jobsData.jobs[0].steps.map((step: any) => ({
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          started_at: step.started_at,
          completed_at: step.completed_at
        }))
      }
    }

    return NextResponse.json({
      status: runData.status,
      conclusion: runData.conclusion,
      html_url: runData.html_url,
      created_at: runData.created_at,
      updated_at: runData.updated_at,
      steps: steps
    })

  } catch (error) {
    console.error('Workflow status error:', error)
    return NextResponse.json(
      { error: 'ワークフロー状態の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}