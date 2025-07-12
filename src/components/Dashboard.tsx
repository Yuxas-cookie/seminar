'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Users, CalendarDays, CalendarX } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import SeminarCalendar from './SeminarCalendar'
import StaffManagement from './StaffManagement'
import BlockedDatesManagement from './BlockedDatesManagement'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('calendar')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-4 sm:pt-6 pb-4"
        >
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              エキスパ セミナー管理
            </h1>
          </div>
        </motion.div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="flex justify-center mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex flex-col sm:flex-row bg-white rounded-2xl sm:rounded-full shadow-lg p-1 w-full sm:w-auto"
            >
              <Tabs.Trigger
                value="calendar"
                className={`
                  flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-full 
                  font-semibold transition-all text-sm sm:text-base
                  ${activeTab === 'calendar' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                カレンダー
              </Tabs.Trigger>
              
              <Tabs.Trigger
                value="staff"
                className={`
                  flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-full 
                  font-semibold transition-all text-sm sm:text-base
                  ${activeTab === 'staff' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                スタッフ管理
              </Tabs.Trigger>
              
              <Tabs.Trigger
                value="blocked"
                className={`
                  flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-full 
                  font-semibold transition-all text-sm sm:text-base
                  ${activeTab === 'blocked' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <CalendarX className="w-4 h-4 sm:w-5 sm:h-5" />
                入れない日
              </Tabs.Trigger>
            </motion.div>
          </Tabs.List>

          <Tabs.Content value="calendar" className="focus:outline-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <SeminarCalendar />
            </motion.div>
          </Tabs.Content>

          <Tabs.Content value="staff" className="focus:outline-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl mx-0 sm:mx-2 md:mx-6"
            >
              <StaffManagement />
            </motion.div>
          </Tabs.Content>

          <Tabs.Content value="blocked" className="focus:outline-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl mx-0 sm:mx-2 md:mx-6"
            >
              <BlockedDatesManagement />
            </motion.div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}