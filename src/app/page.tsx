'use client'

import dynamic from 'next/dynamic'

// FullCalendarはクライアントサイドでのみ動作するため、dynamic importを使用
const Dashboard = dynamic(
  () => import('@/components/Dashboard'),
  { ssr: false }
)

export default function Home() {
  return <Dashboard />
}