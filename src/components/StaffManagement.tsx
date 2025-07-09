'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Edit2, Trash2, X, Check, Palette, ChevronUp, ChevronDown } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { supabase, Staff } from '@/lib/supabase'
import ColorPicker from './ColorPicker'
import { getContrastTextColor } from '@/lib/colorUtils'

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    theme_color: '#3B82F6'
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      console.log('Fetching staff data...')
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('display_order')

      if (error) {
        console.error('Supabase error in StaffManagement:', JSON.stringify(error, null, 2))
        throw error
      }
      
      console.log('Staff data fetched:', data)
      setStaff(data || [])
    } catch (err: any) {
      console.error('Error fetching staff:', err)
      setError(`スタッフ情報の取得に失敗しました: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Check if color is already used
      const usedColors = staff
        .filter(s => editingStaff ? s.id !== editingStaff.id : true)
        .map(s => s.theme_color)
      
      if (usedColors.includes(formData.theme_color)) {
        setError('この色は既に使用されています。別の色を選択してください。')
        return
      }

      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update({
            name: formData.name,
            theme_color: formData.theme_color
          })
          .eq('id', editingStaff.id)

        if (error) throw error
      } else {
        // Add new staff
        // 新規追加時は最大のdisplay_orderを取得
        const maxOrder = Math.max(...staff.map(s => s.display_order || 0), -1)
        const { error } = await supabase
          .from('staff')
          .insert({
            name: formData.name,
            theme_color: formData.theme_color,
            display_order: maxOrder + 1
          })

        if (error) throw error
      }

      // Reset form and refresh list
      setFormData({ name: '', theme_color: '#3B82F6' })
      setShowAddDialog(false)
      setEditingStaff(null)
      await fetchStaff()
    } catch (err: any) {
      setError(err.message || '保存に失敗しました')
    }
  }

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember)
    setFormData({
      name: staffMember.name,
      theme_color: staffMember.theme_color
    })
    setShowAddDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchStaff()
    } catch (err) {
      console.error('Error deleting staff:', err)
      setError('削除に失敗しました')
    }
  }

  const getNextAvailableColor = () => {
    const usedColors = staff.map(s => s.theme_color)
    const presetColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
    ]
    return presetColors.find(color => !usedColors.includes(color)) || '#6B7280'
  }

  const moveStaff = async (staffId: string, direction: 'up' | 'down') => {
    const currentIndex = staff.findIndex(s => s.id === staffId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= staff.length) return
    
    const updatedStaff = [...staff]
    const temp = updatedStaff[currentIndex]
    updatedStaff[currentIndex] = updatedStaff[newIndex]
    updatedStaff[newIndex] = temp
    
    // display_orderを更新
    try {
      const updates = updatedStaff.map((s, index) => ({
        id: s.id,
        display_order: index
      }))
      
      for (const update of updates) {
        const { error } = await supabase
          .from('staff')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
        
        if (error) throw error
      }
      
      await fetchStaff()
    } catch (error) {
      console.error('Error updating display order:', error)
      setError('並び順の更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <UserPlus className="w-8 h-8 text-indigo-600" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">スタッフ管理</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingStaff(null)
            setFormData({ name: '', theme_color: getNextAvailableColor() })
            setShowAddDialog(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 
                   text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm sm:text-base
                   w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" />
          スタッフを追加
        </motion.button>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {staff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-4 sm:p-6"
              style={{ borderTop: `4px solid ${member.theme_color}` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                    style={{ 
                      backgroundColor: member.theme_color,
                      color: getContrastTextColor(member.theme_color)
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{member.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex flex-col">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => moveStaff(member.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded transition-colors ${
                        index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      <ChevronUp className="w-3 h-3 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => moveStaff(member.id, 'down')}
                      disabled={index === staff.length - 1}
                      className={`p-1 rounded transition-colors ${
                        index === staff.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    </motion.button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(member)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(member.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </motion.button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: member.theme_color }}
                  />
                  <span className="text-sm text-gray-600">{member.theme_color}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
                           bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 z-50"
                >
                  <Dialog.Title className="text-2xl font-bold text-gray-800 mb-6">
                    {editingStaff ? 'スタッフ編集' : '新規スタッフ追加'}
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    スタッフ情報を入力してください
                  </Dialog.Description>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名前 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                                 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        テーマカラー <span className="text-red-500">*</span>
                      </label>
                      <ColorPicker
                        value={formData.theme_color}
                        onChange={(color) => setFormData({ ...formData, theme_color: color })}
                        usedColors={staff
                          .filter(s => editingStaff ? s.id !== editingStaff.id : true)
                          .map(s => s.theme_color)
                        }
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="submit"
                        className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 
                                 text-white rounded-lg font-medium hover:shadow-lg 
                                 transform hover:scale-105 transition-all"
                      >
                        {editingStaff ? '更新' : '追加'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDialog(false)
                          setEditingStaff(null)
                          setFormData({ name: '', theme_color: '#3B82F6' })
                          setError(null)
                        }}
                        className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 rounded-lg 
                                 font-medium hover:bg-gray-300 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </form>

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
  )
}