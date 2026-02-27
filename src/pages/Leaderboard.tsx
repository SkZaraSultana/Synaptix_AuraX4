import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import { getLeaderboard } from '../lib/api'

type LeaderboardItem = {
  userId: number
  name: string
  streak: number
  quizScore: number
  codingScore: number
  total: number
}

export default function Leaderboard() {
  const [items, setItems] = useState<LeaderboardItem[]>([])
  useEffect(() => { getLeaderboard(20).then(r => setItems(r.data.items || [])) }, [])
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <Card>
        <div className="font-display text-xl mb-4">🏆 Leaderboard</div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.userId} className="grid grid-cols-8 gap-3 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="font-bold text-2xl">#{idx+1}</div>
              <div className="col-span-2 font-medium">{it.name}</div>
              <div className="text-xs text-slate-600">Streak: {it.streak}</div>
              <div className="text-xs text-slate-600">Quiz: {it.quizScore}%</div>
              <div className="text-xs text-slate-600">Coding: {it.codingScore}%</div>
              <div className="col-span-2 text-right font-bold text-brand-blue">{it.total} pts</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

