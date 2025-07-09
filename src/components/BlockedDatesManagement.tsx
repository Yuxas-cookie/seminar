'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CalendarX, 
  CalendarRange,
  CalendarDays,
  AlertCircle,
  Check
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase, BlockedDate, Staff } from '@/lib/supabase'
import { format, addDays, eachDayOfInterval, isWeekend, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import DatePickerCalendar from './DatePickerCalendar'

type AddMode = 'single' | 'range' | 'weekday' | 'calendar'

const WEEKDAYS = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
]

export default function BlockedDatesManagement() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('calendar')
  const [selectedDate, setSelectedDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedBlockedIds, setSelectedBlockedIds] = useState<string[]>([])
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([])

  useEffect(() => {
    fetchBlockedDates()
    fetchStaff()
  }, [])

  const fetchBlockedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            theme_color,
            display_order
          )
        `)
        .order('date')

      if (error) {
        console.error('Supabase error in BlockedDatesManagement:', JSON.stringify(error, null, 2))
        throw error
      }
      
      console.log('Blocked dates fetched:', data?.length || 0, 'records')
      setBlockedDates(data || [])
    } catch (err) {
      console.error('Error fetching blocked dates:', err)
      setError('入れない日の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('display_order')

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const handleAddBlockedDates = async () => {
    setError(null)
    const datesToBlock: string[] = []

    try {
      if (addMode === 'single') {
        if (!selectedDate) {
          setError('日付を選択してください')
          return
        }
        datesToBlock.push(selectedDate)
      } else if (addMode === 'calendar') {
        if (calendarSelectedDates.length === 0) {
          setError('日付を選択してください')
          return
        }
        datesToBlock.push(...calendarSelectedDates)
      } else if (addMode === 'range') {
        if (!selectedDate || !endDate) {
          setError('開始日と終了日を選択してください')
          return
        }
        const start = new Date(selectedDate)
        const end = new Date(endDate)
        if (start > end) {
          setError('終了日は開始日より後の日付を選択してください')
          return
        }
        const days = eachDayOfInterval({ start, end })
        days.forEach(day => {
          datesToBlock.push(format(day, 'yyyy-MM-dd'))
        })
      } else if (addMode === 'weekday') {
        if (!selectedDate || !endDate || selectedWeekdays.length === 0) {
          setError('期間と曜日を選択してください')
          return
        }
        const start = new Date(selectedDate)
        const end = new Date(endDate)
        if (start > end) {
          setError('終了日は開始日より後の日付を選択してください')
          return
        }
        const days = eachDayOfInterval({ start, end })
        days.forEach(day => {
          if (selectedWeekdays.includes(getDay(day))) {
            datesToBlock.push(format(day, 'yyyy-MM-dd'))
          }
        })
      }

      // 既存の入れない日を除外（スタッフIDも考慮）
      const newDates = datesToBlock.filter(date => {
        return !blockedDates.some(bd => 
          bd.date === date && 
          (bd.staff_id === selectedStaffId || (!bd.staff_id && !selectedStaffId))
        )
      })

      if (newDates.length === 0) {
        setError(`追加する日付はすべて既に${selectedStaffId ? 'このスタッフの' : '全員の'}入れない日に設定されています`)
        return
      }

      // バッチ挿入
      const { error: insertError } = await supabase
        .from('blocked_dates')
        .insert(
          newDates.map(date => ({
            date,
            staff_id: selectedStaffId || null
          }))
        )

      if (insertError) throw insertError

      setShowAddDialog(false)
      resetForm()
      await fetchBlockedDates()
    } catch (err: any) {
      setError(err.message || '入れない日の追加に失敗しました')
    }
  }

  const handleDeleteBlockedDate = async (id: string) => {
    if (!confirm('この入れない日を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchBlockedDates()
    } catch (err) {
      console.error('Error deleting blocked date:', err)
      setError('入れない日の削除に失敗しました')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedBlockedIds.length === 0) return
    
    const count = selectedBlockedIds.length
    if (!confirm(`選択した${count}件の入れない日を削除してもよろしいですか？`)) return

    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .in('id', selectedBlockedIds)

      if (error) throw error
      
      setSelectedBlockedIds([])
      await fetchBlockedDates()
    } catch (err) {
      console.error('Error deleting selected blocked dates:', err)
      setError('選択した入れない日の削除に失敗しました')
    }
  }

  const toggleSelection = (id: string) => {
    if (selectedBlockedIds.includes(id)) {
      setSelectedBlockedIds(selectedBlockedIds.filter(sid => sid !== id))
    } else {
      setSelectedBlockedIds([...selectedBlockedIds, id])
    }
  }

  const selectAll = () => {
    if (selectedBlockedIds.length === blockedDates.length) {
      setSelectedBlockedIds([])
    } else {
      setSelectedBlockedIds(blockedDates.map(bd => bd.id))
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('すべての入れない日を削除してもよろしいですか？この操作は取り消せません。')) return

    try {
      // すべてのIDを取得してから削除
      const allIds = blockedDates.map(bd => bd.id)
      
      if (allIds.length === 0) return
      
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .in('id', allIds)

      if (error) throw error
      
      setSelectedBlockedIds([])
      await fetchBlockedDates()
    } catch (err) {
      console.error('Error deleting all blocked dates:', err)
      setError('入れない日の一括削除に失敗しました')
    }
  }

  const resetForm = () => {
    setSelectedDate('')
    setEndDate('')
    setSelectedWeekdays([])
    setSelectedStaffId('')
    setAddMode('calendar')
    setError(null)
    setCalendarSelectedDates([])
  }

  const toggleCalendarDate = (date: string) => {
    if (calendarSelectedDates.includes(date)) {
      setCalendarSelectedDates(calendarSelectedDates.filter(d => d !== date))
    } else {
      setCalendarSelectedDates([...calendarSelectedDates, date])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CalendarX className="w-8 h-8 text-red-600" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">入れない日管理</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {blockedDates.length > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={selectAll}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                         font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base
                         w-full sm:w-auto"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedBlockedIds.length === blockedDates.length && selectedBlockedIds.length > 0 ? '選択解除' : 'すべて選択'}</span>
                <span className="sm:hidden">{selectedBlockedIds.length === blockedDates.length && selectedBlockedIds.length > 0 ? '解除' : '全選択'}</span>
              </motion.button>
              {selectedBlockedIds.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                           font-medium hover:bg-red-700 transition-colors text-sm sm:text-base
                           w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  {selectedBlockedIds.length}件削除
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDeleteAll}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                         font-medium hover:bg-red-700 transition-colors text-sm sm:text-base
                         w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">すべて削除</span>
                <span className="sm:hidden">全削除</span>
              </motion.button>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              resetForm()
              setShowAddDialog(true)
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 
                     text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm sm:text-base
                     w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">入れない日を追加</span>
            <span className="sm:hidden">追加</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium"
        >
          {error}
        </motion.div>
      )}

      {selectedBlockedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <p className="text-blue-800 font-medium">
            {selectedBlockedIds.length}件選択中
          </p>
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        {blockedDates.length === 0 ? (
          <div className="text-center py-12">
            <CalendarX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">入れない日が設定されていません</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {blockedDates.map((blocked, index) => (
                <motion.div
                  key={blocked.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    selectedBlockedIds.includes(blocked.id)
                      ? 'bg-red-200 border-red-400 hover:bg-red-300'
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}
                  onClick={() => toggleSelection(blocked.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedBlockedIds.includes(blocked.id)}
                      onChange={() => toggleSelection(blocked.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <CalendarX className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {format(new Date(blocked.date), 'yyyy年MM月dd日 (E)', { locale: ja })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {blocked.staff ? (
                          <span 
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{
                              backgroundColor: blocked.staff.theme_color,
                              color: blocked.staff.theme_color ? 
                                (parseInt(blocked.staff.theme_color.slice(1), 16) > 0xffffff/2 ? '#000' : '#fff') : '#fff'
                            }}
                          >
                            {blocked.staff.name}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-medium">
                            全員
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBlockedDate(blocked.id)
                    }}
                    className="p-2 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AnimatePresence>
          {showAddDialog && (
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
                           bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 z-50 max-h-[90vh] overflow-y-auto"
                >
                  <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">
                    入れない日の追加
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    入れない日を追加する方法を選択してください
                  </Dialog.Description>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        担当者 <span className="text-gray-500 font-normal">（空欄の場合は全員）</span>
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">全員</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        追加方法
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'calendar', label: 'カレンダー選択', icon: Calendar },
                          { value: 'single', label: '単一日', icon: CalendarDays },
                          { value: 'range', label: '期間', icon: CalendarRange },
                          { value: 'weekday', label: '曜日指定', icon: CalendarDays }
                        ].map((mode) => (
                          <button
                            key={mode.value}
                            onClick={() => setAddMode(mode.value as AddMode)}
                            className={`
                              flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                              ${addMode === mode.value 
                                ? 'border-red-500 bg-red-50 text-red-700' 
                                : 'border-gray-300 hover:border-gray-400 text-gray-700'
                              }
                            `}
                          >
                            <mode.icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {addMode === 'calendar' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          カレンダーから日付を選択
                        </label>
                        <DatePickerCalendar
                          selectedDates={calendarSelectedDates}
                          onDateToggle={toggleCalendarDate}
                          existingBlockedDates={blockedDates.map(bd => ({
                            date: bd.date,
                            staff_id: bd.staff_id || null
                          }))}
                          selectedStaffId={selectedStaffId}
                        />
                      </div>
                    )}

                    {addMode === 'single' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          日付
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                   focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {(addMode === 'range' || addMode === 'weekday') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            開始日
                          </label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                     focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            終了日
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={selectedDate}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                     focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {addMode === 'weekday' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          曜日を選択
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {WEEKDAYS.map((day) => (
                            <label
                              key={day.value}
                              className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                                       hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={selectedWeekdays.includes(day.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWeekdays([...selectedWeekdays, day.value])
                                  } else {
                                    setSelectedWeekdays(selectedWeekdays.filter(d => d !== day.value))
                                  }
                                }}
                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              />
                              <span className="text-sm font-medium">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}


                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleAddBlockedDates}
                      className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 
                               text-white rounded-lg font-medium transition-colors"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => setShowAddDialog(false)}
                      className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 
                               text-gray-800 rounded-lg font-medium transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  )
}