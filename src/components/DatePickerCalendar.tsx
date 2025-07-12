'use client'

import React from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface DatePickerCalendarProps {
  selectedDates: string[]
  onDateToggle: (date: string) => void
  existingBlockedDates?: Array<{ date: string; staff_id: string | null }>
  selectedStaffId?: string
}

export default function DatePickerCalendar({ 
  selectedDates, 
  onDateToggle, 
  existingBlockedDates = [],
  selectedStaffId 
}: DatePickerCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 月の最初の日の曜日を取得（0:日曜日）
  const startDayOfWeek = monthStart.getDay()
  const emptyDays = Array(startDayOfWeek).fill(null)

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    // 選択中のスタッフで既にブロックされている日付はスキップ
    const isAlreadyBlocked = existingBlockedDates.some(
      bd => bd.date === dateStr && 
      (bd.staff_id === selectedStaffId || (!bd.staff_id && !selectedStaffId))
    )
    if (isAlreadyBlocked) return
    onDateToggle(dateStr)
  }

  const isDateBlocked = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return existingBlockedDates.some(
      bd => bd.date === dateStr && 
      (bd.staff_id === selectedStaffId || (!bd.staff_id && !selectedStaffId))
    )
  }

  const isDateSelected = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedDates.includes(dateStr)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年MM月', { locale: ja })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-semibold py-1 ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダー本体 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空のセル */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        
        {/* 日付セル */}
        {days.map((date) => {
          const isSelected = isDateSelected(date)
          const isBlocked = isDateBlocked(date)
          const isToday = isSameDay(date, new Date())
          const dayOfWeek = date.getDay()
          
          return (
            <motion.button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={isBlocked}
              whileHover={{ scale: isBlocked ? 1 : 1.05 }}
              whileTap={{ scale: isBlocked ? 1 : 0.95 }}
              className={`
                aspect-square rounded-lg border-2 transition-all
                flex items-center justify-center text-sm font-medium
                ${isBlocked 
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                  : isSelected
                    ? 'bg-red-500 border-red-600 text-white hover:bg-red-600'
                    : isToday
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${!isBlocked && !isSelected && (
                  dayOfWeek === 0 ? 'text-red-600' : 
                  dayOfWeek === 6 ? 'text-blue-600' : 
                  'text-gray-700'
                )}
              `}
            >
              {format(date, 'd')}
            </motion.button>
          )
        })}
      </div>

      {/* 選択中の日付数 */}
      {selectedDates.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {selectedDates.length}日選択中
        </div>
      )}
    </div>
  )
}