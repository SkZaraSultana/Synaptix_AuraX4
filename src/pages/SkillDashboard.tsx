import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getProfile } from '../lib/api'
import api from '../lib/api'

type ProgressData = {
  streak?: number
  quizScore?: number
  codingScore?: number
  history?: { day: string; score: number }[]
}

export default function SkillDashboard() {
  const [data, setData] = useState<ProgressData>({ history: [] })
  const [name, setName] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const prof = await getProfile()
        setName(prof.data.name)
        const res = await api.get('/user/progress')
        setData({ history: [], ...(res.data.data || {}) })
      } catch (e) {
        console.error('Failed to load progress:', e)
      }
    })()
  }, [])

  async function simulateProgress() {
    const next: ProgressData = {
      ...data,
      streak: (data.streak || 0) + 1,
      quizScore: Math.min(100, (data.quizScore || 60) + 2),
      codingScore: Math.min(100, (data.codingScore || 55) + 3),
      history: [
        ...(data.history || []),
        {
          day: `D${(data.history?.length || 0) + 1}`,
          score: Math.min(100, (data.history?.at(-1)?.score || 50) + 2),
        },
      ],
    }
    try {
      await api.post('/user/progress', { data: next })
      setData(next)
    } catch (e) {
      console.error('Failed to save progress:', e)
    }
  }

  const badges = [] as string[]
  if ((data.codingScore || 0) >= 80) badges.push('Python Pro')
  if ((data.quizScore || 0) >= 80) badges.push('Domain Scholar')
  if ((data.streak || 0) >= 7) badges.push('Weekly Streak')

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <Card>
        <div className="font-display text-xl mb-2">Welcome back, {name}</div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            Streak: <b>{data.streak || 0}</b> days
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            Quiz Score: <b>{data.quizScore || 0}%</b>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            Coding Score: <b>{data.codingScore || 0}%</b>
          </div>
        </div>
        <button onClick={simulateProgress} className="mt-4 btn-primary">
          Log Progress
        </button>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-medium mb-2">Progress Over Time</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history || []}>
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="font-medium mb-2">Badges & Achievements</div>
          <div className="flex flex-wrap gap-2">
            {badges.length ? (
              badges.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple text-white text-xs"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No badges yet. Keep going!</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
