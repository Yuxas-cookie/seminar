'use client'

import React, { useState, useEffect } from 'react'
import { supabase, Staff } from '@/lib/supabase'
import { UserCheck, User } from 'lucide-react'
import { getContrastTextColor } from '@/lib/colorUtils'

interface StaffSelectorProps {
  seminarId: string
  currentStaffId?: string
  onStaffAssigned: (staffId: string | null) => void
}

export default function StaffSelector({ seminarId, currentStaffId, onStaffAssigned }: StaffSelectorProps) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(currentStaffId || null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    setSelectedStaffId(currentStaffId || null)
  }, [currentStaffId])

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStaffChange = async (staffId: string | null) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('seminars')
        .update({ staff_id: staffId })
        .eq('id', seminarId)

      if (error) throw error

      setSelectedStaffId(staffId)
      onStaffAssigned(staffId)
    } catch (error) {
      console.error('Error assigning staff:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        担当スタッフ
      </label>
      
      <div className="space-y-2">
        <button
          onClick={() => handleStaffChange(null)}
          disabled={saving}
          className={`
            w-full text-left px-4 py-3 rounded-lg border transition-all
            flex items-center gap-3
            ${!selectedStaffId 
              ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold' 
              : 'border-gray-300 hover:border-gray-400 text-gray-700 font-medium'
            }
            ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <User className="w-5 h-5" />
          <span>未割り当て</span>
          {!selectedStaffId && <UserCheck className="w-5 h-5 ml-auto" />}
        </button>

        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => handleStaffChange(member.id)}
            disabled={saving}
            className={`
              w-full text-left px-4 py-3 rounded-lg border transition-all
              flex items-center gap-3
              ${selectedStaffId === member.id 
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold' 
                : 'border-gray-300 hover:border-gray-400 text-gray-700 font-medium'
              }
              ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ 
                backgroundColor: member.theme_color,
                color: getContrastTextColor(member.theme_color)
              }}
            >
              {member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-medium">{member.name}</div>
            </div>
            {selectedStaffId === member.id && <UserCheck className="w-5 h-5" />}
          </button>
        ))}
      </div>

      {saving && (
        <div className="text-sm text-gray-500 text-center mt-2">
          保存中...
        </div>
      )}
    </div>
  )
}