import React from 'react'
import { motion } from 'framer-motion'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

type ATSSubScores = {
  keyword: number
  section: number
  format: number
  impact: number
  conciseness: number
}

type Props = {
  score: number
  subScores?: ATSSubScores
}

export default function ATSScoreDisplay({ score, subScores }: Props) {
  const getColor = (s: number) => {
    if (s >= 80) return '#10b981' // green
    if (s >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const radialData = [{ name: 'ATS Score', value: score, fill: getColor(score) }]

  return (
    <div className="space-y-6">
      {/* Main ATS Score Circle */}
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold" style={{ color: getColor(score) }}>
              {score}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">ATS Score</div>
          </div>
        </div>
      </div>

      {/* Sub-Scores Breakdown */}
      {subScores && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Score Breakdown</h3>
          {Object.entries(subScores).map(([key, value], idx) => (
            <motion.div
              key={key}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-1"
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-slate-600 dark:text-slate-400">
                  {key === 'conciseness' ? 'Length' : key}
                </span>
                <span className="font-medium" style={{ color: getColor(value) }}>
                  {value}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: getColor(value) }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

