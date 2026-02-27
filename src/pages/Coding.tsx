import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Code2,
  Compass,
  Feather,
  Flame,
  Lightbulb,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from 'lucide-react'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDomain } from '../contexts/DomainProvider'
import {
  getCodingOverview,
  getCodingLesson,
  getNextCodingQuestion,
  submitCodingQuestion,
  requestCodingHint,
  updateCodingTrackProgress,
  getCodingTrackContent,
  getTrendingSkills,
} from '../lib/api'
import { useGamificationStore } from '../store/gamification'
import { cn } from '../utils/cn'

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  smoothScrolling: true,
}

type Overview = Awaited<ReturnType<typeof getCodingOverview>>['data']
type Lesson = Awaited<ReturnType<typeof getCodingLesson>>['data']
type QuestionResponse = Awaited<ReturnType<typeof getNextCodingQuestion>>['data']
type RunResponse = Awaited<ReturnType<typeof submitCodingQuestion>>['data']
type HintResponse = Awaited<ReturnType<typeof requestCodingHint>>['data']

const chipPalette: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  Intermediate: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
  Advanced: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
}

const CodingPage: React.FC = () => {
  const { domain, domainLabel } = useDomain()
  const queryClient = useQueryClient()
  const addXp = useGamificationStore((state) => state.addXp)
  const mergeBadges = useGamificationStore((state) => state.mergeBadges)
  const navigate = useNavigate()

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [questionRefreshKey, setQuestionRefreshKey] = useState(0)
  const [code, setCode] = useState('')
  const [lastResult, setLastResult] = useState<RunResponse | null>(null)

  const overviewQuery = useQuery({
    queryKey: ['codingOverview', domain],
    queryFn: () => getCodingOverview(domain ? { domain } : undefined).then((res) => res.data as Overview),
  })

  useEffect(() => {
    if (overviewQuery.data?.focus_skill && !selectedSkill) {
      setSelectedSkill(overviewQuery.data.focus_skill)
    }
  }, [overviewQuery.data?.focus_skill, selectedSkill])

  const lessonQuery = useQuery({
    queryKey: ['codingLesson', selectedSkill, domain],
    enabled: Boolean(selectedSkill),
    queryFn: () =>
      getCodingLesson(selectedSkill!, domain ? { domain } : undefined).then((res) => res.data as Lesson),
  })

  const trackQuery = useQuery({
    queryKey: ['codingTrack', domain],
    enabled: Boolean(overviewQuery.data?.current_track),
    queryFn: () => getCodingTrackContent(domain ? { domain } : undefined).then((res) => res.data as any),
  })

  const questionQuery = useQuery({
    queryKey: ['codingQuestion', domain, questionRefreshKey],
    enabled: overviewQuery.isSuccess,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getNextCodingQuestion(domain ? { domain } : undefined)
      return res.data as QuestionResponse
    },
    onSuccess: (data) => {
      setCode(data.question?.starter_code ?? '')
      setLastResult(null)
    },
  })

  const trendingQuery = useQuery({
    queryKey: ['codingTrending', domainLabel],
    queryFn: () => getTrendingSkills({ domain: domainLabel }).then((res) => res.data.skills),
  })

  const submitMutation = useMutation({
    mutationFn: submitCodingQuestion,
    onSuccess: (data) => {
      setLastResult(data)
      if (data?.xp_awarded) {
        addXp(data.xp_awarded)
      }
      if (data?.badges?.length) {
        mergeBadges(data.badges)
      }
      if (data.passed) {
        confetti({ particleCount: 140, spread: 60, origin: { y: 0.6 } })
        toast.success('Brilliant! Interview-ready progress recorded.')
      } else {
        toast('Submission saved — review the feedback to iterate.', { icon: '🛠️' })
      }
      queryClient.invalidateQueries({ queryKey: ['codingOverview', domain] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Unable to grade submission.')
    },
  })

  const hintMutation = useMutation({
    mutationFn: requestCodingHint,
  })

  const trackProgressMutation = useMutation({
    mutationFn: updateCodingTrackProgress,
    onSuccess: () => {
      toast.success('Track progress updated')
      queryClient.invalidateQueries({ queryKey: ['codingOverview', domain] })
    },
  })

  const overviewLoading = overviewQuery.isLoading
  const overview = overviewQuery.data
  const lesson = lessonQuery.data
  const question = questionQuery.data?.question

  const masteryRing = useMemo(() => {
    const mastery = overview?.progress.mastery_rate ?? 0
    const circumference = 2 * Math.PI * 40
    return {
      dash: `${circumference * mastery} ${circumference}`,
      masteryPct: Math.round(mastery * 100),
    }
  }, [overview?.progress.mastery_rate])

  const handleSubmit = (codeOverride?: string) => {
    if (!question) return
    submitMutation.mutate({
      question_id: question.question_id,
      code: codeOverride ?? code,
      language: question.language,
    })
  }

  const handleHint = async () => {
    if (!question) return
    try {
      const res = await hintMutation.mutateAsync({
        question_id: question.question_id,
        attempt: lastResult ? lastResult.passed_tests + 1 : 1,
      })
      const hintData = res as HintResponse
      toast(hintData.hint, { icon: '💡', duration: 6000 })
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No hints available right now.')
    }
  }

  const handleTrackToggle = (itemId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    if (!overview?.current_track?.track_id) {
      toast.error('Track not available yet. Refresh to reload playlists.')
      return
    }
    trackProgressMutation.mutate({ track_id: overview.current_track.track_id, item_id: itemId, status })
  }

  if (overviewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner />
      </div>
    )
  }

  if (overviewQuery.isError || !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Card className="max-w-lg text-center space-y-4 p-10">
          <h2 className="text-xl font-semibold">Coding experience unavailable</h2>
          <p className="text-sm text-slate-400">
            We couldn’t generate your coding plan right now. Please refresh or re-run your resume analysis to try
            again.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-slate-500">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            <span>Guided Coding Journey</span>
                </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl max-w-3xl">
            Learn, practice, and assess skills that matter for {domainLabel ?? 'your domain'} roles
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl">
            Each session blends a targeted lesson, guided coding, adaptive assessment, and trend-powered projects to
            move you toward interview-ready confidence.
          </p>
        </motion.header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Streak</span>
              <Flame className="h-4 w-4 text-amber-400" />
                </div>
            <h3 className="text-3xl font-semibold">{overview.progress.streak_days}</h3>
            <p className="text-xs text-slate-400">Daily practice streak. Keep it alive to unlock bonus challenges.</p>
            </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Total XP</span>
              <Sparkles className="h-4 w-4 text-brand-purple" />
                </div>
            <h3 className="text-3xl font-semibold">{overview.progress.xp}</h3>
            <p className="text-xs text-slate-400">Earn XP by completing lessons, passing challenges, and shipping projects.</p>
            </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-6 flex items-center gap-4">
            <div className="relative h-24 w-24">
              <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="fill-none stroke-slate-700/60"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="fill-none stroke-brand-blue"
                  strokeWidth="8"
                  strokeDasharray={masteryRing.dash}
                  strokeLinecap="round"
                  animate={{ strokeDasharray: masteryRing.dash }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold">
                {masteryRing.masteryPct}%
                  </div>
                </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Mastery</p>
              <h3 className="text-lg font-semibold">Interview-ready meter</h3>
              <p className="text-xs text-slate-400">
                Summary of your mastery across core skills. Push it above 80% to unlock mock interviews.
              </p>
                  </div>
                      </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Weekly Challenge</span>
              <Target className="h-4 w-4 text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold">{overview.weekly_challenge?.title ?? 'New project drops every Friday'}</h3>
            <p className="text-xs text-slate-400 line-clamp-3">
              {overview.weekly_challenge?.description ??
                'We analyse job trends to deliver one meaningful, domain-specific build every week.'}
            </p>
                        <Button
              variant="secondary"
              className="w-full justify-center bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/30"
              onClick={() => navigate('/projects')}
            >
              Explore projects
            </Button>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="bg-slate-900/70 border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Skill focus</h2>
                <p className="text-xs text-slate-400">
                  Spark pairs your resume gaps with live job trends to recommend what you should learn next.
                </p>
              </div>
                        <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuestionRefreshKey((prev) => prev + 1)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700"
                        >
                <RefreshCw className="h-4 w-4" />
                Refresh question
                        </Button>
                      </div>

            {trendingQuery.data?.length ? (
              <div className="flex flex-wrap gap-2">
                {trendingQuery.data.slice(0, 6).map((item: any, idx: number) => (
                  <span key={`${item.token || item.skill || item?.name || idx}`} className="px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs">
                    {item.token || item.skill || item?.name || item}
                                </span>
                ))}
                              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overview.next_skills.map((skill, idx) => (
                <button
                  key={skill.skill ? `${skill.skill}-${idx}` : idx}
                  onClick={() => setSelectedSkill(skill.skill)}
                                  className={cn(
                    'rounded-xl border p-4 text-left transition backdrop-blur bg-white/5/10 hover:border-brand-blue/40',
                    selectedSkill === skill.skill ? 'border-brand-blue/80 shadow-lg shadow-brand-blue/20' : 'border-white/10'
                  )}
                          >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                    <span>{skill.skill}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] uppercase', chipPalette[skill.difficulty] ?? '')}>
                      {skill.difficulty}
                                </span>
                              </div>
                  {skill.reason && <p className="mt-3 text-xs text-slate-400">{skill.reason}</p>}
                  {skill.recommended_resources?.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-400">
                      {skill.recommended_resources.slice(0, 2).map((resource, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Compass className="h-3.5 w-3.5 text-brand-purple" />
                          <span>{resource.title ?? resource.type}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </button>
              ))}
                      </div>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-brand-purple" />
              <div>
                <h2 className="text-lg font-semibold">Your streak log</h2>
                <p className="text-xs text-slate-400">Recent attempts and XP growth.</p>
                    </div>
              </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(overview.skill_progress ?? []).map((skill) => (
                <div key={skill.name} className="rounded-lg border border-white/5 bg-slate-950/40 p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>{skill.name}</span>
                    <span>{Math.round(skill.mastery * 100)}% mastery</span>
                                    </div>
                  <p className="mt-1 text-slate-500">
                    Last practiced: {skill.last_practiced_at ? new Date(skill.last_practiced_at).toLocaleDateString() : '—'}
                  </p>
                                </div>
                              ))}
              {!overview.skill_progress?.length && (
                <p className="text-xs text-slate-500">
                  Complete your first coding challenge to unlock mastery tracking.
                </p>
              )}
                  </div>
          </Card>
          </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card className="bg-slate-900/70 border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Feather className="h-5 w-5 text-brand-blue" />
              <h2 className="text-lg font-semibold">Learn: {lesson?.title ?? selectedSkill ?? 'Select a skill'}</h2>
            </div>
            {lessonQuery.isLoading ? (
              <div className="py-6 flex justify-center">
        <LoadingSpinner />
      </div>
            ) : lesson ? (
              <div className="space-y-4">
                <div className="space-y-2 text-sm text-slate-300">
                  <div
                    className="prose prose-sm prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: lesson.markdown }}
                    />
                  </div>
                {lesson.demo_code && (
                  <pre className="rounded-lg border border-white/10 bg-slate-950/70 text-xs text-slate-100 p-4 overflow-auto">
                    {lesson.demo_code}
                  </pre>
                )}
                {lesson.steps?.length ? (
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-[0.3em] text-slate-500">Mini tasks</h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {lesson.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                </div>
                ) : null}
                  </div>
            ) : (
              <p className="text-sm text-slate-500">Select a recommended skill tile to view its lesson.</p>
            )}
          </Card>

          <Card className="bg-slate-900/70 border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-amber-300" />
                <div>
                <h2 className="text-lg font-semibold">Practice path</h2>
                  <p className="text-xs text-slate-400">
                  Blend curated curriculum with Spark playlists for this domain.
                </p>
            </div>
            </div>
            {trackQuery.isLoading ? (
              <div className="py-6 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : trackQuery.data?.track ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {(trackQuery.data.track.items ?? []).map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-white/5 bg-slate-950/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-medium">{item.title}</span>
                      <button
                        className="text-brand-blue hover:underline"
                        onClick={() =>
                          handleTrackToggle(
                            item.id,
                            item.status === 'completed' ? 'not-started' : 'completed'
                          )
                        }
                                >
                        {item.status === 'completed' ? 'Undo' : 'Mark done'}
                      </button>
                              </div>
                    <p className="text-slate-400">{item.summary ?? item.type}</p>
                              </div>
                ))}
                {trackQuery.data.playlist?.length ? (
                  <div className="rounded-lg border border-brand-purple/40 bg-brand-purple/10 p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-purple">Playlist boost</p>
                    <p className="text-sm text-slate-100">
                      Trending questions injected today: {trackQuery.data.playlist.length}
                    </p>
                      </div>
                ) : null}
                </div>
              ) : (
              <p className="text-sm text-slate-500">Track content will appear once playlists finish generating.</p>
            )}
          </Card>
        </section>

        <Card className="bg-slate-900/80 border-slate-800 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-emerald-300" />
                <div>
                <h2 className="text-lg font-semibold">Assess: adaptive coding task</h2>
                  <p className="text-xs text-slate-400">
                  Auto-graded with hidden cases. Pass to level-up your mastery and streak.
                  </p>
                </div>
                </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lightbulb className="h-4 w-4" />
              Need a nudge? Ask for an AI hint after attempting the problem.
              </div>
            </div>

          {questionQuery.isLoading || !question ? (
            <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)_260px]">
              <div className="space-y-4 border border-white/5 rounded-xl bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span>{question.skill}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] uppercase', chipPalette[question.difficulty] ?? '')}>
                    {question.difficulty}
                  </span>
                  </div>
                <h3 className="text-sm font-semibold text-slate-100">{question.title}</h3>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{question.prompt}</p>

                {question.guided_steps?.length ? (
                    <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500">Guided steps</h4>
                    <ul className="space-y-2 text-xs text-slate-400">
                      {question.guided_steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-brand-blue mt-0.5" />
                          <span>{step.text ?? step}</span>
                        </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                {question.walkthrough?.length ? (
                    <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-[0.3em] text-slate-500">Line-by-line walkthrough</h4>
                    <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4">
                      {question.walkthrough.map((line, idx) => (
                        <li key={`${idx}-${line.slice(0, 24)}`} className="leading-relaxed">
                          {line}
                        </li>
                      ))}
                    </ol>
                    </div>
                  ) : null}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleHint}
                  disabled={hintMutation.isPending}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700"
                >
                  {hintMutation.isPending ? <LoadingSpinner size={16} /> : <Lightbulb className="h-4 w-4" />}
                  Request hint
                </Button>

                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Play className="h-3.5 w-3.5" />
                    <span>How to run</span>
                  </div>
                  <p>
                    Write your code in the editor, press <kbd className="rounded bg-slate-800 px-1">Ctrl</kbd> + <kbd className="rounded bg-slate-800 px-1">Enter</kbd> (or tap Run) to execute the public tests, then Submit to grade against hidden cases.
                  </p>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/50">
                  <Editor
                    height="70vh"
                  language={question.language ?? 'python'}
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => setCode(value ?? '')}
                    options={editorOptions}
                  />
                </div>

              <div className="space-y-4 border border-white/5 rounded-xl bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Hidden tests
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {(question.tests ?? []).map((test, idx) => {
                    const testName = (test as any).name ?? `Test ${idx + 1}`
                    const isHidden = Boolean((test as any).hidden ?? true)
                    const hint = (test as any).hint
                    return (
                      <div key={testName} className="rounded-lg border border-white/5 bg-slate-950/50 p-2">
                  <div className="flex items-center justify-between">
                          <span className="text-slate-200">{testName}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            {isHidden ? 'Hidden' : 'Public'}
                    </span>
                        </div>
                        {hint && <p className="text-slate-500">Hint: {hint}</p>}
                      </div>
                    )
                  })}
                  </div>

                <div className="flex flex-col gap-2">
                    <Button
                    onClick={() => handleSubmit()}
                    disabled={!code.trim() || submitMutation.isPending}
                    className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/85"
                    >
                    {submitMutation.isPending ? <LoadingSpinner size={18} /> : <Send className="h-4 w-4" />}
                    Submit for grading
                    </Button>
                    <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700"
                    onClick={() => handleSubmit(code)}
                    disabled={!code.trim() || submitMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                    Run tests again
                    </Button>
                  </div>

                <AnimatePresence>
                  {lastResult ? (
                      <motion.div
                        key="results"
                      initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2 text-xs"
                      >
                          <div
                            className={cn(
                          'rounded-lg border p-3',
                          lastResult.passed
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        )}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">
                            {lastResult.passed ? 'All tests passed' : 'Keep iterating'}
                          </span>
                          <span>
                            {lastResult.passed_tests}/{lastResult.total_tests} · {lastResult.score.toFixed(1)}%
                          </span>
                        </div>
                        {lastResult.xp_awarded ? (
                          <p className="mt-2 uppercase tracking-[0.3em] text-[10px]">
                            +{lastResult.xp_awarded} XP {lastResult.streak ? `· streak ${lastResult.streak}` : ''}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {lastResult.results.map((result, idx) => (
                          <div
                            key={`${result.name}-${idx}`}
                            className={cn(
                              'rounded-lg border p-2',
                              result.passed
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                                : 'border-rose-500/20 bg-rose-500/10 text-rose-100'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Lightbulb className="h-3.5 w-3.5" />
                              )}
                              <span className="font-semibold text-slate-100">{result.name}</span>
                            </div>
                            {!result.passed && result.hint && (
                              <p className="text-slate-100/80 mt-1">Hint: {result.hint}</p>
                            )}
                            {!result.passed && result.error && (
                              <p className="text-slate-100/80 mt-1">
                                Error: <code>{result.error}</code>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      </motion.div>
                    ) : (
                    <p className="text-xs text-slate-500">
                      Submit to view detailed test feedback, XP, and mastery updates.
                    </p>
                    )}
                  </AnimatePresence>

                {question.practice_question ? (
                  <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-3 space-y-2 text-xs text-slate-100">
                    <div className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-[0.3em] text-[10px]">Extra practice</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100">{question.practice_question.title ?? 'Try this variation'}</h4>
                    <p className="text-slate-200/80 leading-relaxed">{question.practice_question.prompt}</p>
                    {question.practice_question.hint && (
                      <p className="text-slate-300/70">Hint: {question.practice_question.hint}</p>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-slate-800 hover:bg-slate-700"
                      onClick={() => {
                        toast('Clone the editor and implement this variant after submitting the main task.', { icon: '🧠' })
                      }}
                    >
                      Challenge accepted
                    </Button>
                  </div>
                ) : null}
              </div>
              </div>
            )}
          </Card>
      </div>
    </div>
  )
}

export default CodingPage
