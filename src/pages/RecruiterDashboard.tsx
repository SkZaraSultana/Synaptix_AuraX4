import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import authStore from '../store/auth'
import {
  createMatchingProject,
  getMatchingProjects,
  getProjectCandidates,
} from '../lib/api'

type RequirementForm = {
  skill_name: string
  required_level: number
  weight: number
}

type CandidateSummary = {
  user_id: number
  user_name: string
  demographic_group?: string
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
  recruiter_id: number
}

export default function RecruiterDashboard() {
  const user = authStore(s => s.user)
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState<RequirementForm[]>([
    { skill_name: 'Python', required_level: 7, weight: 1.0 },
  ])
  const [fairnessEnabled, setFairnessEnabled] = useState(false)
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const isRecruiter = useMemo(() => user?.role === 'recruiter', [user])

  useEffect(() => {
    if (!isRecruiter) return
    getMatchingProjects()
      .then(res => setProjects(res.data))
      .catch(() => {
        // silent for now
      })
  }, [isRecruiter])

  const handleAddRequirement = () => {
    setRequirements(prev => [...prev, { skill_name: '', required_level: 5, weight: 1 }])
  }

  const handleRequirementChange = (index: number, key: keyof RequirementForm, value: string) => {
    setRequirements(prev => {
      const next = [...prev]
      const item = { ...next[index] }
      if (key === 'required_level' || key === 'weight') {
        const num = Number(value)
        ;(item as any)[key] = isNaN(num) ? 0 : num
      } else {
        ;(item as any)[key] = value
      }
      next[index] = item
      return next
    })
  }

  const handleCreateProject = async () => {
    if (!title.trim() || !description.trim() || !requirements.length) return
    setLoading(true)
    try {
      const payload = {
        title,
        description,
        requirements: requirements
          .filter(r => r.skill_name.trim())
          .map(r => ({
            skill_name: r.skill_name.trim(),
            required_level: r.required_level || 1,
            weight: r.weight || 1,
          })),
      }
      const res = await createMatchingProject(payload)
      const projectId = res.data.project_id
      setProjects(prev => [...prev, {
        id: projectId,
        title: res.data.title,
        description,
        recruiter_id: user?.id || 0,
      }])
      setSelectedProjectId(projectId)
      await loadCandidates(projectId, fairnessEnabled)
    } finally {
      setLoading(false)
    }
  }

  const loadCandidates = async (projectId: number, fairness: boolean) => {
    setLoading(true)
    try {
      const res = await getProjectCandidates(projectId, fairness)
      setCandidates(res.data.candidates)
      setSelectedCandidate(res.data.candidates[0] || null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProject = async (id: number) => {
    setSelectedProjectId(id)
    await loadCandidates(id, fairnessEnabled)
  }

  const handleToggleFairness = async () => {
    const next = !fairnessEnabled
    setFairnessEnabled(next)
    if (selectedProjectId) {
      await loadCandidates(selectedProjectId, next)
    }
  }

  const chartData = useMemo(() => {
    if (!selectedCandidate) return []
    const breakdown = selectedCandidate.explanation.skill_breakdown || {}
    return Object.entries(breakdown).map(([name, value]) => ({
      skill: name,
      contribution: value,
    }))
  }, [selectedCandidate])

  if (!isRecruiter) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <h2 className="font-display text-2xl mb-2">Recruiter Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400">
            You need a recruiter account to access this dashboard. Please log out and register as a recruiter.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-display text-2xl mb-4">Create Matching Project</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="AI Intern - ML Pipeline Engineer"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the internship or project and expectations."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Skill Requirements & Weights</label>
              <div className="space-y-3">
                {requirements.map((req, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <input
                      value={req.skill_name}
                      onChange={e => handleRequirementChange(idx, 'skill_name', e.target.value)}
                      placeholder="Skill (e.g. Python)"
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={req.required_level}
                      onChange={e => handleRequirementChange(idx, 'required_level', e.target.value)}
                      placeholder="Required (1-10)"
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      step={0.1}
                      value={req.weight}
                      onChange={e => handleRequirementChange(idx, 'weight', e.target.value)}
                      placeholder="Weight"
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="mt-3" onClick={handleAddRequirement}>
                + Add Skill Requirement
              </Button>
            </div>
            <Button onClick={handleCreateProject} disabled={loading}>
              {loading ? 'Saving...' : 'Create Project'}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">Projects</h2>
            <div className="flex items-center gap-2 text-sm">
              <span>Fairness Mode</span>
              <button
                onClick={handleToggleFairness}
                className={`w-10 h-6 rounded-full relative transition ${
                  fairnessEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition ${
                    fairnessEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
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
                No matching projects yet. Create one to start ranking applicants.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-display text-2xl mb-4">Ranked Candidates</h2>
          {loading && <p className="text-sm text-slate-500">Loading candidates...</p>}
          {!loading && !candidates.length && (
            <p className="text-sm text-slate-500">
              No applications yet for this project. Once students apply, they will appear here.
            </p>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {candidates.map(c => (
              <button
                key={c.user_id}
                onClick={() => setSelectedCandidate(c)}
                className={`w-full text-left p-3 rounded-lg border text-sm ${
                  selectedCandidate?.user_id === c.user_id
                    ? 'border-brand-blue bg-brand-blue/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-blue/60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{c.user_name}</div>
                    {c.demographic_group && (
                      <div className="text-xs text-slate-500">Group: {c.demographic_group}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Match</div>
                    <div className="font-semibold">
                      {c.match_score.toFixed(2)}
                    </div>
                    {fairnessEnabled && c.fairness_adjusted_score != null && (
                      <div className="text-[11px] text-emerald-500">
                        Fair: {c.fairness_adjusted_score.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl mb-2">Score Breakdown</h2>
          {!selectedCandidate && (
            <p className="text-sm text-slate-500">
              Select a candidate to view their skill contributions and reasoning.
            </p>
          )}
          {selectedCandidate && (
            <>
              <p className="text-sm text-slate-500 mb-2">
                {selectedCandidate.explanation.reasoning_text}
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="skill" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="contribution" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <div>GPA contribution: {selectedCandidate.explanation.gpa_contribution.toFixed(2)}</div>
                <div>
                  Experience contribution:{' '}
                  {selectedCandidate.explanation.experience_contribution.toFixed(2)}
                </div>
                {selectedCandidate.explanation.missing_skills.length > 0 && (
                  <div>
                    Missing skills:{' '}
                    {selectedCandidate.explanation.missing_skills.slice(0, 5).join(', ')}
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

