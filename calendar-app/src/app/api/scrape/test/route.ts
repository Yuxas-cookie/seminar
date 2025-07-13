import { NextResponse } from 'next/server'

export async function GET() {
  // テスト用のモックデータを返す
  const mockResult = {
    success: true,
    added: [
      { date: '2025-01-20', time: '14:00:00', count: 3 },
      { date: '2025-01-22', time: '18:00:00', count: 5 }
    ],
    updated: [
      { date: '2025-01-15', time: '20:00:00', old_count: 2, new_count: 4 }
    ],
    removed: [
      { date: '2025-01-12', time: '12:00:00' }
    ],
    summary: '追加: 2件, 更新: 1件, 削除: 1件'
  }

  return NextResponse.json(mockResult)
}