'use client'

import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase, Seminar, BlockedDate, Staff } from '@/lib/supabase'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import '../app/calendar-styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  BarChart3,
  Sparkles,
  X,
  Ban,
  AlertCircle
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import UpdateButton from './UpdateButton'
import StaffSelector from './StaffSelector'
import { getContrastTextColor, getDarkerShade, applyParticipantBrightness } from '@/lib/colorUtils'
import { logError } from '@/lib/errorUtils'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  extendedProps: {
    participantCount?: number
    eventDate: string
    eventTime?: string
    staffId?: string
    staffName?: string
    staffColor?: string
    isBlocked?: boolean
    blockReason?: string
    date?: string
  }
}

export default function SeminarCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [previousEvents, setPreviousEvents] = useState<CalendarEvent[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [showBlockedDateDialog, setShowBlockedDateDialog] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [blockReason, setBlockReason] = useState<string>('')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [staff, setStaff] = useState<Staff[]>([])
  const [isSelectingDates, setIsSelectingDates] = useState(false)

  useEffect(() => {
    fetchSeminars()
    fetchBlockedDates()
    fetchStaff()
  }, [])

  const fetchSeminars = async () => {
    try {
      console.log('Fetching seminars data...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // まず、基本的なクエリから始める
      const query = supabase
        .from('seminars')
        .select('*')
        .order('event_date')
        .order('event_time')
      
      console.log('Query object:', query)
      
      const { data, error, status, statusText } = await query

      console.log('Response status:', status, statusText)
      console.log('Response error:', error)
      console.log('Response data:', data)

      if (error) {
        logError('fetchSeminars', error)
        throw error
      }
      
      console.log('Seminars fetched successfully:', data?.length || 0, 'records')

      if (data) {
        // スタッフ情報を別途取得
        const staffIds = [...new Set(data.filter(s => s.staff_id).map(s => s.staff_id))]
        let staffMap: Record<string, Staff> = {}
        
        if (staffIds.length > 0) {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .in('id', staffIds)
          
          if (staffError) {
            console.error('Error fetching staff:', staffError)
          } else if (staffData) {
            staffMap = staffData.reduce((acc, staff) => {
              acc[staff.id] = staff
              return acc
            }, {} as Record<string, Staff>)
          }
        }

        const calendarEvents: CalendarEvent[] = data.map((seminar: Seminar) => {
          const startDateTime = `${seminar.event_date}T${seminar.event_time}`
          const endTime = new Date(startDateTime)
          endTime.setHours(endTime.getHours() + 1)
          
          const staff = seminar.staff_id ? staffMap[seminar.staff_id] : undefined
          const hasParticipants = seminar.participant_count > 0
          
          // ルール1: 担当者の色（なければデフォルトカラー）
          const baseColor = staff?.theme_color || '#9CA3AF' // デフォルトはグレー
          
          // ルール2: 参加者の有無で明暗を調整
          const backgroundColor = applyParticipantBrightness(baseColor, hasParticipants)
          const borderColor = getDarkerShade(backgroundColor)
          const textColor = getContrastTextColor(backgroundColor)

          return {
            id: seminar.id,
            title: `${seminar.participant_count}名${staff ? ` - ${staff.name}` : ''}`,
            start: startDateTime,
            end: endTime.toISOString(),
            backgroundColor,
            borderColor,
            textColor,
            extendedProps: {
              participantCount: seminar.participant_count,
              eventDate: seminar.event_date,
              eventTime: seminar.event_time,
              staffId: seminar.staff_id,
              staffName: staff?.name,
              staffColor: staff?.theme_color
            }
          }
        })
        setEvents(calendarEvents)
      }
    } catch (error) {
      console.error('Error fetching seminars:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    console.log('更新処理開始...')
    
    // 現在のイベントを保存
    setPreviousEvents(events)
    console.log('現在のイベント数:', events.length)
    
    // 新しいデータを取得
    const { data: newData, error } = await supabase
      .from('seminars')
      .select('*')
      .eq('is_deleted', false)  // 削除されていないデータのみ取得
      .order('event_date')
      .order('event_time')

    if (error) {
      console.error('Error fetching updated seminars:', error)
      throw error
    }

    if (!newData) return { added: [], updated: [], removed: [] }
    
    console.log('新しいデータ数:', newData.length)

    // 変更を検出
    const newEvents = newData.map((seminar: Seminar) => ({
      id: seminar.id,
      date: seminar.event_date,
      time: seminar.event_time,
      participants: seminar.participant_count
    }))

    const oldEvents = events.filter(e => !e.extendedProps.isBlocked).map(event => ({
      id: event.id,
      date: event.extendedProps.eventDate,
      time: event.extendedProps.eventTime || '',
      participants: event.extendedProps.participantCount || 0
    }))

    // 新規追加を検出
    const added = newEvents.filter(newEvent => 
      !oldEvents.some(oldEvent => 
        oldEvent.date === newEvent.date && oldEvent.time === newEvent.time
      )
    ).map(event => ({
      date: event.date,
      time: event.time || '',
      participants: event.participants
    }))

    // 更新を検出
    const updated = newEvents.filter(newEvent => {
      const oldEvent = oldEvents.find(old => 
        old.date === newEvent.date && old.time === newEvent.time
      )
      return oldEvent && oldEvent.participants !== newEvent.participants
    }).map(newEvent => {
      const oldEvent = oldEvents.find(old => 
        old.date === newEvent.date && old.time === newEvent.time
      )!
      return {
        date: newEvent.date,
        time: newEvent.time || '',
        oldParticipants: oldEvent.participants,
        newParticipants: newEvent.participants
      }
    })

    // 削除を検出
    const removed = oldEvents.filter(oldEvent => 
      !newEvents.some(newEvent => 
        newEvent.date === oldEvent.date && newEvent.time === oldEvent.time
      )
    ).map(event => ({
      date: event.date,
      time: event.time || ''
    }))

    // 結果をログ出力
    console.log('変更検出結果:', {
      added: added.length,
      updated: updated.length,
      removed: removed.length
    })

    // カレンダーを更新
    await fetchSeminars()

    return { added, updated, removed }
  }

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

      if (error) throw error
      setBlockedDates(data || [])
    } catch (error) {
      console.error('Error fetching blocked dates:', error)
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

  const handleEventClick = (info: any) => {
    if (info.event.extendedProps.isBlocked) {
      // 入れない日をクリックした場合
      const blockedStaffList = info.event.extendedProps.blockedStaffList || []
      const staffNames = blockedStaffList.map((s: any) => s.name).join('、')
      alert(`${info.event.extendedProps.date}の入れない人:\n${staffNames}\n\n個別の削除は「入れない日」タブから行ってください。`)
    } else {
      setSelectedEvent(info.event)
    }
  }

  const handleDateClick = (info: any) => {
    const clickedDate = info.dateStr
    
    if (isSelectingDates) {
      // 複数日選択モード
      if (selectedDates.includes(clickedDate)) {
        setSelectedDates(selectedDates.filter(d => d !== clickedDate))
      } else {
        setSelectedDates([...selectedDates, clickedDate])
      }
    } else {
      // 通常モード
      const isBlocked = blockedDates.some(bd => bd.date === clickedDate)
      const hasSeminar = events.some(e => e.extendedProps.eventDate === clickedDate)
      
      if (!isBlocked && !hasSeminar) {
        setSelectedDates([clickedDate])
        setBlockReason('')
        setSelectedStaffId('')
        setShowBlockedDateDialog(true)
      }
    }
  }

  const handleAddBlockedDate = async () => {
    try {
      const insertData = selectedDates.map(date => ({
        date,
        reason: blockReason || null,
        staff_id: selectedStaffId || null
      }))

      const { error } = await supabase
        .from('blocked_dates')
        .insert(insertData)

      if (error) throw error

      setShowBlockedDateDialog(false)
      setSelectedDates([])
      setBlockReason('')
      setSelectedStaffId('')
      await fetchBlockedDates()
    } catch (error) {
      console.error('Error adding blocked date:', error)
      alert('入れない日の追加に失敗しました')
    }
  }

  const handleRemoveBlockedDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchBlockedDates()
    } catch (error) {
      console.error('Error removing blocked date:', error)
      alert('入れない日の削除に失敗しました')
    }
  }

  const eventContent = (eventInfo: any) => {
    const isBlocked = eventInfo.event.extendedProps.isBlocked
    const isMobileView = eventInfo.view.type === 'dayGridMonth' && typeof window !== 'undefined' && window.innerWidth < 640
    
    if (isBlocked) {
      const blockedStaffList = eventInfo.event.extendedProps.blockedStaffList || []
      const hasAllBlocked = eventInfo.event.extendedProps.hasAllBlocked
      
      // モバイル表示
      if (isMobileView) {
        // 全員の場合
        if (hasAllBlocked) {
          return (
            <div className="p-0.5 h-full flex items-center justify-center" 
                 style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>
              <div className="text-center">
                <Ban className="w-3 h-3 mx-auto" />
                <div className="text-[8px] font-bold mt-0.5">全員</div>
              </div>
            </div>
          )
        }
        
        // 個別スタッフの場合 - 名前を短縮表示
        const maxDisplay = 3 // 最大表示人数
        const displayList = blockedStaffList.slice(0, maxDisplay)
        const remaining = blockedStaffList.length - maxDisplay
        
        return (
          <div 
            className="h-full p-0.5" 
            style={{ 
              backgroundColor: '#FEE2E2'
            }}
          >
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <Ban className="w-2 h-2 text-red-600" />
              <span className="text-[7px] font-bold text-red-800">入れない</span>
            </div>
            <div className="space-y-0.5">
              {displayList.map((staff: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-sm px-0.5"
                  style={{
                    backgroundColor: staff.color
                  }}
                >
                  <span 
                    className="text-[7px] font-medium leading-tight block text-center"
                    style={{ color: getContrastTextColor(staff.color) }}
                  >
                    {staff.name.length > 4 ? staff.name.slice(0, 4) : staff.name}
                  </span>
                </div>
              ))}
              {remaining > 0 && (
                <div className="text-[6px] text-gray-600 text-center">
                  他{remaining}名
                </div>
              )}
            </div>
          </div>
        )
      }
      
      // デスクトップ表示
      return (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative overflow-hidden rounded-lg p-1 cursor-pointer
                         transition-all duration-200 shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: eventInfo.event.backgroundColor,
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: eventInfo.event.borderColor,
                  color: eventInfo.event.textColor
                }}
              >
                <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-1 mb-1">
                    <Ban className="w-3 h-3" />
                    <span className="text-xs font-bold">入れない</span>
                  </div>
                  {blockedStaffList && blockedStaffList.length > 0 && (
                    <div className="space-y-1">
                      {/* スタッフのカラーバー表示 */}
                      <div className="flex gap-0.5 flex-wrap">
                        {blockedStaffList.map((staff: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: staff.color,
                              color: getContrastTextColor(staff.color)
                            }}
                          >
                            <span className="font-semibold">
                              {staff.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm shadow-xl max-w-xs"
                sideOffset={5}
              >
                <div className="space-y-2">
                  <div className="font-semibold">入れない人:</div>
                  {blockedStaffList?.map((staff: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: staff.color }}
                      />
                      <span>{staff.name}</span>
                    </div>
                  ))}
                </div>
                <Tooltip.Arrow className="fill-gray-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )
    }
    
    const participantCount = eventInfo.event.extendedProps.participantCount
    const hasParticipants = participantCount > 0
    const staffName = eventInfo.event.extendedProps.staffName
    const backgroundColor = eventInfo.event.backgroundColor
    const borderColor = eventInfo.event.borderColor
    const textColor = eventInfo.event.textColor

    // モバイル表示
    if (isMobileView) {
      return (
        <div 
          className="p-0.5 h-full rounded"
          style={{ 
            backgroundColor: backgroundColor,
            color: textColor
          }}
        >
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-0.5">
              <Clock className="w-2 h-2" />
              <span className="text-[7px] font-medium">{eventInfo.timeText.split(' - ')[0]}</span>
            </div>
            <div className="flex items-center justify-center gap-0.5">
              <Users className="w-2 h-2" />
              <span className="text-[8px] font-bold">{participantCount}名</span>
            </div>
            {staffName && (
              <div className="text-[7px] font-medium text-center truncate px-1">
                {staffName.length > 4 ? staffName.slice(0, 4) : staffName}
              </div>
            )}
          </div>
        </div>
      )
    }
    
    // デスクトップ表示
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-lg p-2 cursor-pointer
                       transition-all duration-200 shadow-sm hover:shadow-md
                       border-2 border-solid"
              style={{
                backgroundColor: backgroundColor,
                color: textColor,
                borderColor: borderColor
              }}
            >
              <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-1 text-xs font-medium mb-1">
                  <Clock className="w-3 h-3" />
                  {eventInfo.timeText}
                </div>
                <div className="flex items-center gap-1 text-xs mb-1">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold">{participantCount}名</span>
                </div>
                {staffName && (
                  <div className="text-xs font-medium mt-1 pt-1 border-t" 
                       style={{ borderColor: `${textColor}30` }}>
                    担当: {staffName}
                  </div>
                )}
              </div>

              {hasParticipants && (
                <motion.div
                  className="absolute -right-1 -top-1"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              )}
            </motion.div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm shadow-xl"
              sideOffset={5}
            >
              クリックして詳細を見る
              <Tooltip.Arrow className="fill-gray-800" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Calendar className="w-16 h-16 text-indigo-600" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">カレンダーを読み込んでいます...</p>
        </motion.div>
      </div>
    )
  }

  // 入れない日をカレンダーイベントに変換
  // 同じ日付の入れない日をグループ化
  const groupedBlockedDates = blockedDates.reduce((acc, blocked) => {
    if (!acc[blocked.date]) {
      acc[blocked.date] = []
    }
    acc[blocked.date].push(blocked)
    return acc
  }, {} as Record<string, BlockedDate[]>)

  const blockedEvents: CalendarEvent[] = Object.entries(groupedBlockedDates).map(([date, blockedList]) => {
    // 全員がブロックされている場合
    const hasAllBlocked = blockedList.some(b => !b.staff_id)
    
    // タイトルを生成
    let title = '× 入れない'
    let blockedStaffList: Array<{ name: string; color: string }> = []
    
    if (hasAllBlocked) {
      blockedStaffList = [{ name: '全員', color: '#EF4444' }]
    } else {
      blockedStaffList = blockedList
        .filter(b => b.staff)
        .map(b => ({
          name: b.staff!.name,
          color: b.staff!.theme_color
        }))
    }
    
    // スタッフリストを並び順でソート
    if (!hasAllBlocked) {
      blockedStaffList.sort((a, b) => {
        const staffA = blockedList.find(bl => bl.staff?.name === a.name)?.staff
        const staffB = blockedList.find(bl => bl.staff?.name === b.name)?.staff
        const orderA = staffA?.display_order ?? 999
        const orderB = staffB?.display_order ?? 999
        return orderA - orderB
      })
    }
    
    return {
      id: `blocked-${date}`,
      title,
      start: date,
      end: date,
      backgroundColor: '#FEE2E2', // 薄い赤色
      borderColor: '#EF4444',
      textColor: '#991B1B',
      extendedProps: {
        eventDate: date,
        isBlocked: true,
        date: date,
        blockedStaffList,
        hasAllBlocked
      }
    }
  })

  const allEvents = [...events, ...blockedEvents]
  const seminars = events.filter(e => !e.extendedProps.isBlocked)
  const totalParticipants = seminars.reduce((sum, e) => sum + (e.extendedProps.participantCount || 0), 0)
  const eventsWithParticipants = seminars.filter(e => (e.extendedProps.participantCount || 0) > 0)

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* 複数日選択モード切り替えボタン */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsSelectingDates(!isSelectingDates)
              setSelectedDates([])
            }}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
              isSelectingDates 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            {isSelectingDates ? '選択モード終了' : '複数日選択'}
          </motion.button>
          
          {isSelectingDates && selectedDates.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowBlockedDateDialog(true)
                setIsSelectingDates(false)
              }}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 
                       text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm sm:text-base"
            >
              <Ban className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedDates.length}日を入れない日に設定</span>
              <span className="sm:hidden">{selectedDates.length}日を設定</span>
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          {[
            { 
              icon: CalendarDays, 
              label: '総セミナー数', 
              value: seminars.length, 
              color: 'from-blue-500 to-cyan-600',
              bgColor: 'from-blue-50 to-cyan-50'
            },
            { 
              icon: Users, 
              label: '参加者あり', 
              value: eventsWithParticipants.length, 
              color: 'from-emerald-500 to-green-600',
              bgColor: 'from-emerald-50 to-green-50'
            },
            { 
              icon: TrendingUp, 
              label: '総参加者数', 
              value: totalParticipants, 
              color: 'from-purple-500 to-pink-600',
              bgColor: 'from-purple-50 to-pink-50'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`
                relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 
                bg-gradient-to-br ${stat.bgColor} 
                border border-white/50 shadow-lg hover:shadow-xl transition-all
              `}
            >
              <div className="absolute right-2 top-2 opacity-10">
                <stat.icon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
              </div>
              
              <div className="relative z-10">
                <div className={`inline-flex p-2 sm:p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-2 sm:mb-4`}>
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">{stat.label}</h3>
                <p className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-gray-100"
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'today'
            }}
            locale='ja'
            events={allEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={eventContent}
            height="auto"
            dayMaxEvents={3}
            buttonText={{
              today: '今日',
              month: '月',
              week: '週',
              day: '日'
            }}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
              startTime: '09:00',
              endTime: '21:00'
            }}
            dayHeaderClassNames="text-sm font-bold text-gray-800 py-3"
            dayCellClassNames={(arg) => {
              // FullCalendarのdayCellClassNamesは日付オブジェクトではなく、argオブジェクトを受け取る
              const dateStr = arg.date.toISOString().split('T')[0]
              const isSelected = selectedDates.includes(dateStr)
              return `hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-red-100 hover:bg-red-200' : ''
              }`
            }}
          />
        </motion.div>

        <Dialog.Root open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <AnimatePresence>
            {selectedEvent && (
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
                      セミナーの詳細情報
                    </Dialog.Description>
                    <Dialog.Close className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </Dialog.Close>

                    <div className="text-center">
                      <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                        <Calendar className="w-8 h-8 text-indigo-600" />
                      </div>
                      
                      <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                        セミナー詳細
                      </Dialog.Title>

                      <div className="space-y-4 mt-6">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-sm text-gray-700 font-medium mb-1">開催日</p>
                          <p className="text-lg font-bold text-gray-900">
                            {selectedEvent.extendedProps.eventDate && 
                              format(new Date(selectedEvent.extendedProps.eventDate), 'yyyy年MM月dd日', { locale: ja })}
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-sm text-gray-700 font-medium mb-1">開催時刻</p>
                          <p className="text-lg font-bold text-gray-900">
                            {selectedEvent.extendedProps.eventTime}
                          </p>
                        </div>

                        <div className={`rounded-xl p-4 border ${
                          (selectedEvent.extendedProps.participantCount || 0) > 0
                            ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <p className={`text-sm font-medium mb-1 ${
                            (selectedEvent.extendedProps.participantCount || 0) > 0
                              ? 'text-indigo-700'
                              : 'text-gray-700'
                          }`}>参加予定者数</p>
                          <p className={`text-3xl font-bold ${
                            (selectedEvent.extendedProps.participantCount || 0) > 0
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'
                              : 'text-gray-500'
                          }`}>
                            {selectedEvent.extendedProps.participantCount || 0}名
                          </p>
                        </div>

                        {selectedEvent.extendedProps.staffName && (
                          <div 
                            className="rounded-xl p-4"
                            style={{ 
                              backgroundColor: selectedEvent.extendedProps.staffColor || '#f3f4f6',
                              color: selectedEvent.extendedProps.staffColor 
                                ? getContrastTextColor(selectedEvent.extendedProps.staffColor) 
                                : undefined
                            }}
                          >
                            <p className="text-sm mb-1 opacity-80">担当スタッフ</p>
                            <p className="text-lg font-semibold">
                              {selectedEvent.extendedProps.staffName}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 border-t pt-6">
                        <StaffSelector
                          seminarId={selectedEvent.id}
                          currentStaffId={selectedEvent.extendedProps.staffId}
                          onStaffAssigned={(staffId) => {
                            // Refresh seminars to show updated staff assignment
                            fetchSeminars()
                          }}
                        />
                      </div>

                      <button
                        onClick={() => setSelectedEvent(null)}
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
        
        <UpdateButton onUpdate={handleUpdate} />

        <Dialog.Root open={showBlockedDateDialog} onOpenChange={setShowBlockedDateDialog}>
          <AnimatePresence>
            {showBlockedDateDialog && (
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
                    <Dialog.Title className="text-2xl font-bold text-gray-800 mb-2">
                      入れない日の設定
                    </Dialog.Title>
                    <Dialog.Description className="text-gray-600 mb-6">
                      {selectedDates.length === 1 
                        ? `${format(new Date(selectedDates[0]), 'yyyy年MM月dd日', { locale: ja })}を入れない日に設定します`
                        : `${selectedDates.length}日を入れない日に設定します`
                      }
                    </Dialog.Description>

                    <div className="space-y-4">
                      {selectedDates.length > 1 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-800 mb-2">選択した日付:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDates.sort().map(date => (
                              <span key={date} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {format(new Date(date), 'MM/dd', { locale: ja })}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          理由（任意）
                        </label>
                        <textarea
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          placeholder="例：会場メンテナンス、祝日、その他の理由"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                   focus:ring-2 focus:ring-red-500 focus:border-transparent
                                   resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <p className="font-semibold mb-1">注意事項</p>
                            <p>この日はセミナーを開催できなくなります。既存のセミナーがある場合は、先に移動または削除してください。</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleAddBlockedDate}
                        className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 
                                 text-white rounded-lg font-medium transition-colors"
                      >
                        入れない日に設定
                      </button>
                      <button
                        onClick={() => setShowBlockedDateDialog(false)}
                        className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 
                                 text-gray-800 rounded-lg font-medium transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>

                    <Dialog.Close className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </Dialog.Close>
                  </motion.div>
                </Dialog.Content>
              </Dialog.Portal>
            )}
          </AnimatePresence>
        </Dialog.Root>
      </div>
    </div>
  )
}