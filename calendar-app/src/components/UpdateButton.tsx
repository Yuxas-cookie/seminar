'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Check, X, AlertCircle, Activity } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface UpdateResult {
  added: Array<{ date: string; time: string; participants: number }>
  updated: Array<{ date: string; time: string; oldParticipants: number; newParticipants: number }>
  removed: Array<{ date: string; time: string }>
}

interface UpdateButtonProps {
  onUpdate: () => Promise<UpdateResult>
}

export default function UpdateButton({ onUpdate }: UpdateButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workflowRunId, setWorkflowRunId] = useState<number | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [progress, setProgress] = useState(0)

  const handleUpdate = async () => {
    setIsUpdating(true)
    setError(null)
    setProgress(0) // プログレスを0%にリセット
    setWorkflowRunId(null)
    setWorkflowStatus(null)
    setWorkflowSteps([])

    try {
      // スクレイピングAPIを呼び出し
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json()
        throw new Error(errorData.error || 'スクレイピングに失敗しました')
      }

      const scrapeResult = await scrapeResponse.json()
      console.log('スクレイピング結果:', scrapeResult)
      
      // GitHub Actionsワークフローの情報を表示
      if (scrapeResult.workflow_run) {
        console.log('🚀 GitHub Actions実行情報:', {
          id: scrapeResult.workflow_run.id,
          status: scrapeResult.workflow_run.status,
          url: scrapeResult.workflow_run.html_url
        })
        console.log(`GitHub Actionsで確認: ${scrapeResult.workflow_run.html_url}`)
        setWorkflowRunId(scrapeResult.workflow_run.id)
        setWorkflowStatus('queued')
        setProgress(10)
      }
      
      // デバッグログを表示
      if (scrapeResult.debugLogs && scrapeResult.debugLogs.length > 0) {
        console.group('🔍 Edge Function デバッグログ')
        scrapeResult.debugLogs.forEach((log: string) => console.log(log))
        console.groupEnd()
      }
      
      if (!scrapeResult.success) {
        throw new Error(scrapeResult.error || 'スクレイピングに失敗しました')
      }

      // GitHub Actionsの場合は、メッセージを表示して処理を終了
      if (scrapeResult.message && scrapeResult.message.includes('GitHub Actions')) {
        // ワークフローIDが取得できない場合でもダミーの進捗を表示
        if (!scrapeResult.workflow_run) {
          let dummyProgress = 10
          const dummyTimer = setInterval(() => {
            dummyProgress += Math.random() * 5
            if (dummyProgress >= 100) {
              dummyProgress = 100
              clearInterval(dummyTimer)
              setUpdateResult({
                added: [],
                updated: [],
                removed: []
              })
              setShowResult(true)
              setIsUpdating(false)
            }
            setProgress(dummyProgress)
          }, 500)
          
          // 30秒後に強制的に完了
          setTimeout(() => {
            clearInterval(dummyTimer)
            setProgress(100)
            setUpdateResult({
              added: [],
              updated: [],
              removed: []
            })
            setShowResult(true)
            setIsUpdating(false)
          }, 30000)
        }
        return
      }

      // 更新結果を取得
      const result = await onUpdate()
      console.log('更新結果:', result)
      
      setUpdateResult(result)
      setShowResult(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新中にエラーが発生しました')
      setShowResult(true)
    } finally {
      setIsUpdating(false)
    }
  }

  const hasChanges = updateResult && (
    updateResult.added.length > 0 ||
    updateResult.updated.length > 0 ||
    updateResult.removed.length > 0
  )

  // GitHub Actionsワークフローの状態を監視
  useEffect(() => {
    if (!workflowRunId || !isUpdating) return

    let progressTimer: NodeJS.Timeout
    
    const checkWorkflowStatus = async () => {
      try {
        const response = await fetch(`/api/workflow-status/${workflowRunId}`)
        if (response.ok) {
          const data = await response.json()
          setWorkflowStatus(data.status)
          setWorkflowSteps(data.steps || [])
          
          // プログレスを計算
          if (data.status === 'in_progress') {
            const completedSteps = data.steps.filter((step: any) => step.conclusion === 'success').length
            const totalSteps = data.steps.length || 1
            const actualProgress = 20 + (completedSteps / totalSteps) * 60
            
            // 実際の進捗が現在の表示より大きい場合は更新
            setProgress(prev => Math.max(prev, actualProgress))
          } else if (data.status === 'completed') {
            // 完了時は100%まで素早く進行
            clearInterval(progressTimer)
            const finalProgress = async () => {
              for (let i = progress; i <= 100; i += 5) {
                setProgress(i)
                await new Promise(resolve => setTimeout(resolve, 50))
              }
              setProgress(100)
              
              if (data.conclusion === 'success') {
                // 成功したら更新結果を取得
                const result = await onUpdate()
                setUpdateResult(result)
              } else {
                setError('スクレイピング処理が失敗しました')
              }
              setShowResult(true)
              setIsUpdating(false)
            }
            finalProgress()
            return
          }
        }
      } catch (err) {
        console.error('ワークフロー状態の確認エラー:', err)
      }
    }

    // ダミーの進捗を表示（ゆっくり増加）
    progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          // 90%まではゆっくり増加
          return prev + Math.random() * 2
        }
        return prev
      })
    }, 1000)

    const statusInterval = setInterval(checkWorkflowStatus, 2000) // 2秒ごとにチェック
    
    return () => {
      clearInterval(statusInterval)
      clearInterval(progressTimer)
    }
  }, [workflowRunId, isUpdating, onUpdate, progress])

  return (
    <>
      <motion.button
        onClick={handleUpdate}
        disabled={isUpdating}
        className={`
          fixed top-8 right-8 z-40
          flex items-center gap-2 px-6 py-3 
          rounded-full shadow-lg font-medium
          transition-all duration-200
          ${isUpdating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl hover:scale-105'
          }
          text-white
        `}
        whileTap={{ scale: 0.95 }}
      >
        <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
        {isUpdating ? '更新中...' : 'データを更新'}
      </motion.button>

      <Dialog.Root open={showResult} onOpenChange={setShowResult}>
        <AnimatePresence>
          {showResult && (
            <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                           bg-white rounded-2xl shadow-2xl p-4 sm:p-8 
                           w-[calc(100vw-2rem)] max-w-md 
                           max-h-[calc(100vh-2rem)] overflow-y-auto
                           z-50"
                >
                  <Dialog.Description className="sr-only">
                    更新結果の詳細
                  </Dialog.Description>
                  <Dialog.Close className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </Dialog.Close>

                  <div className="text-center">
                    {error ? (
                      <>
                        <div className="inline-flex p-4 rounded-full bg-red-100 mb-4">
                          <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                          更新エラー
                        </Dialog.Title>
                        <p className="text-gray-600 mb-6">{error}</p>
                      </>
                    ) : updateResult && hasChanges ? (
                      <>
                        <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
                          <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                          更新完了
                        </Dialog.Title>
                        <div className="space-y-4 mt-6 text-left">
                          {updateResult.added.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <h3 className="font-bold text-green-900 mb-2">
                                新規追加 ({updateResult.added.length}件)
                              </h3>
                              <ul className="space-y-1 text-sm text-green-800 font-medium">
                                {updateResult.added.map((item, index) => (
                                  <li key={index}>
                                    {item.date} {item.time} - {item.participants}名
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {updateResult.updated.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <h3 className="font-bold text-blue-900 mb-2">
                                更新 ({updateResult.updated.length}件)
                              </h3>
                              <ul className="space-y-1 text-sm text-blue-800 font-medium">
                                {updateResult.updated.map((item, index) => (
                                  <li key={index}>
                                    {item.date} {item.time} - 
                                    {item.oldParticipants}名 → {item.newParticipants}名
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {updateResult.removed.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                              <h3 className="font-bold text-red-900 mb-2">
                                削除 ({updateResult.removed.length}件)
                              </h3>
                              <ul className="space-y-1 text-sm text-red-800 font-medium">
                                {updateResult.removed.map((item, index) => (
                                  <li key={index}>
                                    {item.date} {item.time}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex p-4 rounded-full bg-blue-100 mb-4">
                          <Activity className="w-8 h-8 text-blue-600 animate-pulse" />
                        </div>
                        <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                          {workflowStatus === 'completed' ? '処理完了' : 'スクレイピング実行中'}
                        </Dialog.Title>
                        
                        {/* プログレスバー */}
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                          <motion.div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          進捗: {Math.round(progress)}%
                        </p>
                        
                        {/* ステップの詳細 */}
                        {workflowSteps.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">実行ステップ:</h4>
                            <ul className="space-y-1 text-xs">
                              {workflowSteps.map((step, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  {step.conclusion === 'success' ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : step.conclusion === 'failure' ? (
                                    <X className="w-3 h-3 text-red-500" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                                  )}
                                  <span className={`
                                    ${step.conclusion === 'success' ? 'text-green-700' : 
                                      step.conclusion === 'failure' ? 'text-red-700' : 
                                      'text-gray-700'}
                                  `}>
                                    {step.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          {workflowStatus === 'completed' 
                            ? '処理が完了しました。' 
                            : '処理には数分かかります。このまましばらくお待ちください。'}
                        </p>
                      </>
                    )}

                    <button
                      onClick={() => setShowResult(false)}
                      className="mt-6 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 
                               text-white font-medium hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      閉じる
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  )
}