'use client'

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { getContrastTextColor } from '@/lib/colorUtils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  usedColors: string[]
}

// プリセットカラー（見やすく区別しやすい色）
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#22C55E', // Green
  '#FACC15', // Yellow
]

export default function ColorPicker({ value, onChange, usedColors }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value)

  const availableColors = PRESET_COLORS.filter(color => !usedColors.includes(color))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map((color) => {
          const isUsed = usedColors.includes(color) && color !== value
          const isSelected = color === value

          return (
            <button
              key={color}
              type="button"
              onClick={() => !isUsed && onChange(color)}
              disabled={isUsed}
              className={`
                relative w-10 h-10 rounded-lg border-2 transition-all
                ${isSelected ? 'border-gray-800 scale-110' : 'border-gray-300'}
                ${isUsed ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              `}
              style={{ backgroundColor: color }}
              title={isUsed ? '使用済み' : color}
            >
              {isSelected && (
                <Check 
                  className="absolute inset-0 m-auto w-5 h-5 drop-shadow-md" 
                  style={{ color: getContrastTextColor(color) }}
                />
              )}
              {isUsed && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-50 rounded-md" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-800">カスタムカラー:</label>
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            const newColor = e.target.value.toUpperCase()
            setCustomColor(newColor)
            if (!usedColors.includes(newColor)) {
              onChange(newColor)
            }
          }}
          className="w-16 h-10 rounded cursor-pointer"
        />
        <span className="text-sm font-medium text-gray-700">{customColor}</span>
      </div>

      {availableColors.length === 0 && (
        <p className="text-sm font-medium text-amber-700">
          プリセットカラーはすべて使用されています。カスタムカラーを選択してください。
        </p>
      )}
    </div>
  )
}