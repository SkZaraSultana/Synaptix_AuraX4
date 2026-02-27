import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/ui/Card'
import { ResponsiveContainer, RadialBarChart, RadialBar, BarChart, Bar, XAxis, Tooltip } from 'recharts'
import { getDomainProjects, getTrendingSkills, getUserInsights } from '../lib/api'
import { useDomain } from '../contexts/DomainProvider'
import authStore from '../store/auth'

const LEVEL_COLORS: Record<string, string> = {
  Beginner: '#3B82F6',
  Intermediate: '#8B5CF6',
  Advanced: '#22C55E',
}

export default function Dashboard() {
  const { domain, domainLabel } = useDomain()
  const user = authStore((s) => s.user)

  const insightsQuery = useQuery({
    queryKey: ['userInsights'],
    queryFn: () => getUserInsights().then((res) => res.data),
  })

  const trendingQuery = useQuery({
    queryKey: ['trending', domainLabel],
    queryFn: () => getTrendingSkills({ domain: domainLabel }).then((res) => res.data.skills),
  })

  const projectsQuery = useQuery({
    queryKey: ['dashboardProjects', domainLabel],
    queryFn: () => getDomainProjects(domainLabel).then((res) => res.data.projects || res.data),
  })

  const insights = insightsQuery.data
  const levelColor = insights ? LEVEL_COLORS[insights.level?.name || 'Beginner'] : LEVEL_COLORS.Beginner
  const skillScore = [
    {
      name: insights?.level?.name || 'Beginner',
      value: Math.round((insights?.level?.progress || 0) * 100),
      fill: levelColor,
    },
  ]

  const trendingData = (trendingQuery.data || []).map((item: any) => ({
    name: item.skill or item.name or item,
  }))

  const rawProjects = projectsQuery.data || []
  const projectList = Array.isArray(rawProjects) ? rawProjects : rawProjects?.projects ?? []
  const trendingGraph = (trendingQuery.data || []).map((item: any, idx: number) => ({
    name:
      (item && typeof item === 'object' && (item.token || item.skill || item.name)) ||
      (typeof item === 'string' ? item : `Skill ${idx + 1}`),
    val:
      (item && typeof item === 'object' && (item.freq || item.score || item.weight || item.count)) ||
      1,
  }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
          <h1 className="font-display text-3xl mb-2">Welcome back, {user?.name || 'Learner'}!</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your RankRight intelligence board keeps every step aligned to the {domainLabel} market.
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 border border-brand-blue/30"
        >
          <span className="text-sm">
            Focus Domain: <span className="font-semibold text-brand-blue">{domainLabel}</span>
          </span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card>
              <div className="font-medium mb-2">Level & XP</div>
              <div className="text-sm text-slate-500 mb-4">{insights?.level?.name || 'Beginner'} • {insights?.xp ?? 0} XP</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="100%" data={skillScore} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-3">Streak: 🔥 {insights?.streak ?? 0} day(s)</p>
              {insights?.badges?.length ? (
                <p className="text-xs text-slate-400 mt-2">Badges: {insights.badges.slice(0, 3).join(', ')}{insights.badges.length > 3 ? '…' : ''}</p>
              ) : null}
            </Card>
          </motion.div>

          <motion.div className="md:col-span-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <Card>
              <div className="font-medium mb-2">Trending Market Skills</div>
              <div className="h-48">
                {trendingGraph.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendingGraph}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} height={60} angle={-20} textAnchor="end" />
                      <Tooltip />
                      <Bar dataKey="val" fill="#9333EA" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">
                    Run the Spark intelligence job to populate live market data.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
            <Card>
              <div className="font-medium mb-2">Recommended Projects</div>
              <ul className="space-y-2 text-sm">
                {(projectList as any[]).slice(0, 3).map((project) => (
                  <li key={project.title} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-100">{project.title}</span>
                      <span className="text-xs text-brand-blue">{project.difficulty || 'Project'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{project.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
            <Card>
              <div className="font-medium mb-2">Next Recommended Step</div>
              {insights?.next_suggestion ? (
                <div>
                  <p className="text-sm text-slate-500">Focus Skill</p>
                  <h3 className="text-lg font-semibold text-brand-blue">{insights.next_suggestion.skill}</h3>
                  <p className="text-xs text-slate-500 mt-2">Difficulty: {insights.next_suggestion.difficulty}</p>
                  {insights.next_suggestion.reason && (
                    <p className="text-xs text-slate-400 mt-1">Why now? {insights.next_suggestion.reason}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Upload a resume and run the intelligence analysis to unlock guided steps.</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
