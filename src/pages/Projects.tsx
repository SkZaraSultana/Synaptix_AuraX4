import React, { useMemo, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  getDomainProjects,
  getProjectDetail,
  startProject,
  completeProjectStep,
  submitProject,
} from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDomain } from '../contexts/DomainProvider'
import { useGamificationStore } from '../store/gamification'

type ProjectSummary = {
  id: string
  domain: string
  title: string
  difficulty: string
  time_commitment: string
  estimated_time: string
  tech_stack: string[]
  tags: string[]
  summary: string
  market_alignment: string
  progress_status?: string
  completed_steps?: number
  total_steps?: number
}

type ProjectResource = {
  title: string
  url: string
  kind: string
  provider?: string | null
}

type ProjectStep = {
  id: string
  title: string
  description: string
  xp_reward: number
  resources: ProjectResource[]
}

type ProjectDetail = ProjectSummary & {
  why_it_matters: string
  description: string
  dataset?: string | null
  expected_output?: string | null
  github_template?: string | null
  resources: ProjectResource[]
  steps: ProjectStep[]
}

type ProjectProgressEntry = {
  project_id: string
  status: string
  completed_steps: string[]
  total_steps: number
  github_link_submitted?: string | null
  started_at?: string | null
  completed_at?: string | null
  updated_at: string
}

type ProjectProgressResponse = {
  project: ProjectDetail
  progress?: ProjectProgressEntry
}

const DIFFICULTY_FILTERS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const
const TIME_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Short (1-3 days)', value: 'short' },
  { label: 'Medium (1-2 weeks)', value: 'medium' },
  { label: 'Long (1 month+)', value: 'long' },
] as const

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return ''
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return ''
  const diffMs = Date.now() - target
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  const diffMonths = Math.round(diffDays / 30)
  return `${diffMonths} mo${diffMonths === 1 ? '' : 's'} ago`
}

const ProjectProgressRing: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
  return (
    <div className="relative inline-flex h-14 w-14 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="rgba(148,163,184,0.3)"
          strokeWidth="12"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#progressGradient)"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={`${pct * 2.64} 999`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-sm font-semibold text-white">{pct}%</span>
    </div>
  )
}

const Badge: React.FC<{ label: string; tone?: 'primary' | 'neutral' | 'accent' }> = ({ label, tone = 'primary' }) => {
  const classes = {
    primary: 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40',
    accent: 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40',
    neutral: 'bg-slate-700/40 text-slate-200 border border-slate-500/40',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${classes[tone]}`}>
      {label}
    </span>
  )
}

const AnimatedXP: React.FC<{ amount: number }> = ({ amount }) => {
  if (!amount) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-md bg-brand-purple/10 px-3 py-1 text-sm text-brand-purple"
    >
      +{amount} XP
    </motion.div>
  )
}

const Projects: React.FC = () => {
  const { domain, domainLabel } = useDomain()
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTY_FILTERS[number]>('All')
  const [timeFilter, setTimeFilter] = useState<typeof TIME_FILTERS[number]['value']>('all')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [lastXpAwarded, setLastXpAwarded] = useState(0)
  const queryClient = useQueryClient()
  const addXp = useGamificationStore((state) => state.addXp)
  const mergeBadges = useGamificationStore((state) => state.mergeBadges)

  const { data: projects, isLoading, isFetching } = useQuery({
    queryKey: ['projects', domainLabel, difficulty, timeFilter],
    queryFn: async () => {
      const filters: Record<string, string> = { domain: domainLabel }
      if (difficulty !== 'All') filters.difficulty = difficulty
      if (timeFilter !== 'all') filters.time = timeFilter
      const res = await getDomainProjects(domainLabel, filters)
      return res.data as ProjectSummary[]
    },
    enabled: Boolean(domainLabel),
    staleTime: 60_000,
  })

  const {
    data: projectDetail,
    isFetching: loadingDetail,
  } = useQuery({
    queryKey: ['project-detail', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return null
      const res = await getProjectDetail(selectedProject)
      return res.data as ProjectProgressResponse
    },
    enabled: Boolean(selectedProject),
  })

  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    if (selectedProject) {
      queryClient.invalidateQueries({ queryKey: ['project-detail', selectedProject] })
    }
  }, [queryClient, selectedProject])

  const handleXp = useCallback(
    (amount: number, badges?: string[]) => {
      if (amount > 0) {
        setLastXpAwarded(amount)
        addXp(amount)
        setTimeout(() => setLastXpAwarded(0), 3000)
      }
      if (badges?.length) {
        mergeBadges(badges)
      }
    },
    [addXp, mergeBadges]
  )

  const startMutation = useMutation({
    mutationFn: (projectId: string) => startProject(projectId),
    onSuccess: (res) => {
      toast.success('Project kicked off! Time to build.')
      handleXp(40)
      invalidateProjects()
    },
    onError: () => toast.error('Unable to start project.'),
  })

  const stepMutation = useMutation({
    mutationFn: ({ projectId, stepId }: { projectId: string; stepId: string }) =>
      completeProjectStep(projectId, stepId),
    onSuccess: (res) => {
      toast.success('Step recorded! Keep shipping.')
      handleXp(20)
      invalidateProjects()
    },
    onError: () => toast.error('Unable to log step right now.'),
  })

  const submitMutation = useMutation({
    mutationFn: ({ projectId, repo }: { projectId: string; repo: string }) => submitProject(projectId, repo),
    onSuccess: async (res) => {
      toast.success('Project submitted — portfolio leveled up!')
      handleXp(120, ['Portfolio Finisher'])
      setGithubUrl('')
      invalidateProjects()
      const confetti = await import('canvas-confetti')
      confetti.default({ particleCount: 160, spread: 70, origin: { y: 0.6 } })
    },
    onError: () => toast.error('Submission failed. Check GitHub URL and try again.'),
  })

  const activeProgress = projectDetail?.progress
  const completedSteps = new Set(activeProgress?.completed_steps || [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Projects for {domainLabel}</h1>
            <p className="text-sm text-slate-400">
              Curated builds that align with {domainLabel} hiring trends. Track progress and push straight into your resume.
            </p>
          </div>
          <AnimatePresence>{lastXpAwarded > 0 && <AnimatedXP amount={lastXpAwarded} />}</AnimatePresence>
        </header>

        <section className="flex flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {DIFFICULTY_FILTERS.map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  difficulty === level
                    ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40'
                    : 'bg-slate-800/40 text-slate-300 border border-slate-700/60 hover:border-slate-500'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  timeFilter === filter.value
                    ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                    : 'bg-slate-800/40 text-slate-300 border border-slate-700/60 hover:border-slate-500'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1.15fr]">
          <div className="space-y-4">
            {(isLoading || isFetching) && (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner />
              </div>
            )}
            {!isLoading && projects && projects.length === 0 && (
              <Card className="border border-slate-800 bg-slate-900/60 p-8 text-center">
                <h3 className="text-lg font-semibold">No projects found for these filters.</h3>
                <p className="mt-2 text-sm text-slate-400">Try adjusting difficulty or time commitment to explore more builds.</p>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {projects?.map((project) => (
                <motion.div key={project.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Card
                    className={`flex h-full flex-col gap-4 border border-slate-800 bg-slate-900/70 p-5 ${
                      selectedProject === project.id ? 'ring-2 ring-brand-purple/60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <ProjectProgressRing
                        completed={project.completed_steps ?? 0}
                        total={project.total_steps ?? 0}
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge label={project.difficulty} />
                          <Badge label={project.time_commitment} tone="accent" />
                          {project.progress_status === 'completed' && <Badge label="Completed" tone="neutral" />}
                        </div>
                        <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-3">{project.summary}</p>
                    <p className="text-xs text-brand-blue/80">
                      Market demand: <span className="text-slate-200">{project.market_alignment}</span>
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-300/80">
                        {project.tech_stack.slice(0, 3).map((tech) => (
                          <span key={tech} className="rounded-md bg-slate-800/60 px-2 py-1">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedProject(project.id)}
                        className="text-sm text-brand-blue hover:text-white"
                      >
                        View Project
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedProject && (
              <motion.div
                key={selectedProject}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
              >
                <Card className="sticky top-8 flex max-h-[80vh] flex-col gap-5 overflow-y-auto border border-slate-800 bg-slate-900/80 p-6">
                  {loadingDetail && (
                    <div className="flex h-48 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  )}
                  {!loadingDetail && projectDetail && (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-semibold text-white">{projectDetail.project.title}</h2>
                          <p className="mt-2 text-sm text-slate-300">{projectDetail.project.summary}</p>
                        </div>
                        <Button variant="ghost" onClick={() => setSelectedProject(null)} className="text-xs uppercase">
                          Close
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300/90">
                        <Badge label={projectDetail.project.difficulty} />
                        <Badge label={projectDetail.project.time_commitment} tone="accent" />
                        <span className="rounded-md bg-slate-800/50 px-2 py-1 uppercase tracking-wide">
                          {projectDetail.project.estimated_time}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Why it matters</h3>
                        <p className="mt-2 text-slate-200">{projectDetail.project.why_it_matters}</p>
                      </div>
                      <div className="space-y-3 text-sm">
                        <h3 className="text-base font-semibold text-white">Project Overview</h3>
                        <p className="text-slate-300">{projectDetail.project.description}</p>
                        {projectDetail.project.dataset && (
                          <p className="text-slate-300">
                            Dataset:{" "}
                            <a
                              className="text-brand-blue hover:underline"
                              href={projectDetail.project.dataset}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {projectDetail.project.dataset}
                            </a>
                          </p>
                        )}
                        {projectDetail.project.expected_output && (
                          <p className="text-slate-400 text-xs">
                            Expected Output: {projectDetail.project.expected_output}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Resources</h3>
                        <div className="flex flex-col gap-2">
                          {projectDetail.project.resources.map((resource) => (
                            <a
                              key={`${resource.title}-${resource.url}`}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 transition hover:border-brand-blue/50 hover:text-white"
                            >
                              <span className="font-semibold text-white">{resource.title}</span>
                              <span className="ml-2 text-slate-400">
                                {resource.kind} {resource.provider ? `• ${resource.provider}` : ''}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white">Build Checklist</h3>
                          <Badge
                            label={`${activeProgress?.completed_steps.length ?? 0}/${projectDetail.project.steps.length} steps`}
                            tone="neutral"
                          />
                        </div>
                        <div className="space-y-3">
                          {projectDetail.project.steps.map((step) => {
                            const completed = completedSteps.has(step.id)
                            return (
                              <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`rounded-lg border px-4 py-3 ${
                                  completed ? 'border-emerald-500/40 bg-emerald-900/10' : 'border-slate-800 bg-slate-950/70'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">{step.title}</p>
                                    <p className="mt-1 text-sm text-slate-300">{step.description}</p>
                                  </div>
                                  <Badge label={`+${step.xp_reward} XP`} tone="accent" />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {step.resources.map((resource) => (
                                    <a
                                      key={resource.url}
                                      href={resource.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-md border border-slate-800 px-2 py-1 text-xs text-brand-blue hover:border-brand-blue hover:text-white"
                                    >
                                      {resource.title}
                                    </a>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">
                                    {completed ? 'Completed' : 'Pending'}
                                  </span>
                                  <Button
                                    className="px-3 py-1 text-xs"
                                    disabled={completed || stepMutation.isLoading}
                                    onClick={() =>
                                      stepMutation.mutate({ projectId: projectDetail.project.id, stepId: step.id })
                                    }
                                  >
                                    {completed ? 'Done' : 'Mark Completed'}
                                  </Button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-semibold text-white">Ship it</h3>
                        <p className="text-sm text-slate-300">
                          When you publish the build, drop your GitHub link to auto-add resume bullets and unlock the badge.
                        </p>
                        {projectDetail.project.github_template && (
                          <a
                            href={projectDetail.project.github_template}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-blue hover:underline"
                          >
                            View starter template
                          </a>
                        )}
                        <div className="flex flex-col gap-2">
                          <input
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-brand-blue focus:outline-none"
                          />
                          <Button
                            onClick={() => {
                              if (!githubUrl) {
                                toast.error('Please add a GitHub repo link before submitting.')
                                return
                              }
                              submitMutation.mutate({ projectId: projectDetail.project.id, repo: githubUrl })
                            }}
                            disabled={submitMutation.isLoading}
                            className="bg-brand-purple text-white hover:opacity-90"
                          >
                            Submit Project
                          </Button>
                          {activeProgress?.completed_at && (
                            <p className="text-xs text-emerald-400">
                              Submitted {formatRelativeTime(activeProgress.completed_at)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            onClick={() => startMutation.mutate(projectDetail.project.id)}
                            disabled={startMutation.isLoading}
                          >
                            {activeProgress?.status === 'in-progress' ? 'Restart Project' : 'Start Project'}
                          </Button>
                          {activeProgress?.status === 'completed' && (
                            <Badge label="Resume ready" tone="primary" />
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}

export default Projects

