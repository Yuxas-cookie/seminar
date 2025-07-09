'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Check, X, AlertCircle } from 'lucide-react'
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

  const handleUpdate = async () => {
    setIsUpdating(true)
    setError(null)

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
                           bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 z-50"
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
                    ) : hasChanges ? (
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
                        <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
                          <Check className="w-8 h-8 text-gray-600" />
                        </div>
                        <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                          更新完了
                        </Dialog.Title>
                        <p className="text-gray-600 mb-6">
                          新しい変更はありませんでした
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