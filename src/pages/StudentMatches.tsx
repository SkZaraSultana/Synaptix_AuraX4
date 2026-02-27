import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import {
  applyToMatchingProject,
  getMatchingProjects,
  getStudentApplications,
  updateUserSkills,
} from '../lib/api'
import authStore from '../store/auth'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type SkillFormRow = {
  name: string
  proficiency_level: number
}

type ApplicationRow = {
  project_id: number
  project_title: string
  match_score: number
  fairness_adjusted_score?: number | null
  explanation: {
    total_score: number
    original_score: number
    fairness_adjusted_score?: number | null
    skill_breakdown: Record<string, number>
    gpa_contribution: number
    experience_contribution: number
    missing_skills: string[]
    reasoning_text: string
  }
}

type ProjectMeta = {
  id: number
  title: string
  description: string
}

export default function StudentMatches() {
  const user = authStore(s => s.user)
  const [skills, setSkills] = useState<SkillFormRow[]>([
    { name: 'Python', proficiency_level: 7 },
    { name: 'Machine Learning', proficiency_level: 6 },
  ])
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null)
  const [loading, setLoading] = useState(false)

  const isStudent = useMemo(() => !user?.role || user.role === 'student', [user])

  useEffect(() => {
    getMatchingProjects()
      .then(res => setProjects(res.data))
      .catch(() => {
        // ignore for now
      })
    refreshApplications()
  }, [])

  const refreshApplications = async () => {
    try {
      const res = await getStudentApplications()
      setApplications(res.data)
      setSelectedApplication(res.data[0] || null)
    } catch {
      // ignore
    }
  }

  const handleSkillChange = (idx: number, key: keyof SkillFormRow, value: string) => {
    setSkills(prev => {
      const next = [...prev]
      const item = { ...next[idx] }
      if (key === 'proficiency_level') {
        const num = Number(value)
        item.proficiency_level = isNaN(num) ? 0 : num
      } else {
        ;(item as any)[key] = value
      }
      next[idx] = item
      return next
    })
  }

  const addSkillRow = () => {
    setSkills(prev => [...prev, { name: '', proficiency_level: 5 }])
  }

  const saveSkills = async () => {
    setLoading(true)
    try {
      const cleaned = skills.filter(s => s.name.trim())
      if (!cleaned.length) return
      await updateUserSkills({ skills: cleaned })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    try {
      await applyToMatchingProject(selectedProjectId)
      await refreshApplications()
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!selectedApplication) return []
    const breakdown = selectedApplication.explanation.skill_breakdown || {}
    return Object.entries(breakdown).map(([skill, value]) => ({
      skill,
      contribution: value,
    }))
  }, [selectedApplication])

  if (!isStudent) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <h2 className="font-display text-2xl mb-2">Student Matching</h2>
          <p className="text-slate-600 dark:text-slate-400">
            This view is optimized for student accounts. Switch to a student account to see skill-based matching and explanations.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-display text-2xl mb-4">Your Skill Profile</h2>
          <p className="text-sm text-slate-500 mb-3">
            Add your core skills and self-assessed proficiency (1-10). The matching engine uses this to compute competency scores.
          </p>
          <div className="space-y-3">
            {skills.map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                <input
                  value={row.name}
                  onChange={e => handleSkillChange(idx, 'name', e.target.value)}
                  placeholder="Skill (e.g. Python)"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={row.proficiency_level}
                  onChange={e => handleSkillChange(idx, 'proficiency_level', e.target.value)}
                  placeholder="1-10"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <div className="flex items-center justify-end">
                  <span className="text-xs text-slate-500">Core skill</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <Button variant="ghost" onClick={addSkillRow}>
              + Add Skill
            </Button>
            <Button onClick={saveSkills} disabled={loading}>
              {loading ? 'Saving...' : 'Save Skills'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl mb-4">Available Matching Projects</h2>
          <p className="text-sm text-slate-500 mb-3">
            Choose a project to apply. Your skills, GPA and experience will be mapped against its requirements.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`w-full text-left p-3 rounded-lg border text-sm ${
                  selectedProjectId === p.id
                    ? 'border-brand-blue bg-brand-blue/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-blue/60'
                }`}
              >
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-slate-500 line-clamp-2">{p.description}</div>
              </button>
            ))}
            {!projects.length && (
              <p className="text-sm text-slate-500">
                No matching projects available yet. Check back later.
              </p>
            )}
          </div>
          <Button className="mt-3" onClick={handleApply} disabled={loading || !selectedProjectId}>
            {loading ? 'Applying...' : 'Apply to Selected Project'}
          </Button>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-display text-2xl mb-3">Your Applications</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {applications.map(app => (
              <button
                key={app.project_id}
                onClick={() => setSelectedApplication(app)}
                className={`w-full text-left p-3 rounded-lg border text-sm ${
                  selectedApplication?.project_id === app.project_id
                    ? 'border-brand-blue bg-brand-blue/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-blue/60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{app.project_title}</div>
                    <div className="text-xs text-slate-500">
                      Match: {app.match_score.toFixed(2)}
                      {app.fairness_adjusted_score != null && (
                        <> • Fair: {app.fairness_adjusted_score.toFixed(2)}</>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!applications.length && (
              <p className="text-sm text-slate-500">
                You haven't applied to any matching projects yet.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl mb-2">Score Breakdown & Skill Gaps</h2>
          {!selectedApplication && (
            <p className="text-sm text-slate-500">
              Select an application to see how your skills contributed to the score and where gaps exist.
            </p>
          )}
          {selectedApplication && (
            <>
              <p className="text-sm text-slate-500 mb-2">
                {selectedApplication.explanation.reasoning_text}
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="skill" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="contribution" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div>
                  GPA contribution: {selectedApplication.explanation.gpa_contribution.toFixed(2)}
                </div>
                <div>
                  Experience contribution:{' '}
                  {selectedApplication.explanation.experience_contribution.toFixed(2)}
                </div>
                {selectedApplication.explanation.missing_skills.length > 0 && (
                  <div>
                    Missing skills:{' '}
                    {selectedApplication.explanation.missing_skills.slice(0, 5).join(', ')}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

