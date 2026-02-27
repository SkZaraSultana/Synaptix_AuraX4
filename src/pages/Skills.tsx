import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, TrendingUp, Target, Compass, Flame, CheckCircle2 } from 'lucide-react'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDomain } from '../contexts/DomainProvider'
import { getTrendingSkills, getSkillGap, getUserInsights } from '../lib/api'

const chipColors = ['bg-brand-blue/15 text-brand-blue', 'bg-brand-purple/15 text-brand-purple', 'bg-emerald-500/10 text-emerald-400']

type TrendingSkill = {
  name: string
  score?: number | null
  growth?: number | null
  rank: number
  meta?: Record<string, any>
}

type NextSuggestion = {
  skill?: string
  difficulty?: string
  reason?: string
  recommended_resources?: Array<{ title?: string; type?: string; url?: string }>
}

export default function Skills() {
  const { domainLabel } = useDomain()
  const navigate = useNavigate()

  const trendingQuery = useQuery({
    queryKey: ['skillsTrending', domainLabel],
    queryFn: () => getTrendingSkills({ domain: domainLabel }).then((res) => res.data),
    enabled: Boolean(domainLabel),
  })

  const gapQuery = useQuery({
    queryKey: ['skillsGap', domainLabel],
    queryFn: () => getSkillGap({ domain: domainLabel }).then((res) => res.data),
    enabled: Boolean(domainLabel),
  })

  const insightsQuery = useQuery({
    queryKey: ['skillsInsights'],
    queryFn: () => getUserInsights().then((res) => res.data),
  })

  const trendingSkills: TrendingSkill[] = useMemo(() => {
    const raw = trendingQuery.data?.skills ?? []
    return raw.map((item: any, idx: number) => {
      if (!item) {
        return { name: `Skill ${idx + 1}`, rank: idx + 1 }
      }
      if (typeof item === 'string') {
        return { name: item, rank: idx + 1 }
      }
      const name = item.skill || item.name || item.token || `Skill ${idx + 1}`
      const score = typeof item.trend_score === 'number'
        ? item.trend_score
        : item.score ?? item.weight ?? item.demand ?? null
      const growth = typeof item.growth === 'number'
        ? item.growth
        : item.delta ?? item.week_over_week ?? null
      const rank = item.rank ?? idx + 1
      return { name, score, growth, rank, meta: item }
    })
  }, [trendingQuery.data])

  const missingSkills: string[] = useMemo(() => gapQuery.data?.missing_skills ?? [], [gapQuery.data])
  const insights = insightsQuery.data || {}
  const nextSuggestion: NextSuggestion | undefined = insights?.next_suggestion
  const badges: string[] = Array.isArray(insights?.badges) ? insights.badges : []
  const xp = insights?.xp ?? 0
  const streak = insights?.streak ?? 0
  const levelName = insights?.level?.name ?? 'Beginner'
  const levelProgress = Math.round((insights?.level?.progress ?? 0) * 100)

  const isLoading = trendingQuery.isLoading || gapQuery.isLoading || insightsQuery.isLoading
  const sparkMessage = trendingQuery.data?.message as string | undefined

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <header className="rounded-3xl bg-gradient-to-r from-brand-blue/10 via-brand-purple/10 to-brand-blue/5 border border-brand-blue/20 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-slate-900/70 border border-brand-purple/30 text-xs uppercase tracking-[0.3em] text-brand-purple">
              <Sparkles className="h-4 w-4" /> Spark Intelligence
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">{domainLabel} market radar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300 max-w-2xl">
              Live trends and intelligence distilled from Spark pipelines. Use these signals to close your skill gaps and
              stay interview ready.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-700/40">
                Focus domain: <span className="font-semibold text-brand-blue">{domainLabel}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-700/40">
                Level: <span className="font-semibold text-brand-purple">{levelName}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-700/40">
                XP: <span className="font-semibold text-emerald-500">{xp}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-700/40">
                Streak: <span className="font-semibold text-orange-500">{streak}🔥</span>
              </span>
            </div>
          </div>
          <Card className="bg-white/80 dark:bg-slate-900/70 border-slate-200/40 dark:border-slate-800/50 w-full lg:w-72">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              <Compass className="h-4 w-4 text-brand-blue" /> Priority focus
            </div>
            {nextSuggestion ? (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-brand-blue">{nextSuggestion.skill || 'Next skill milestone'}</h3>
                {nextSuggestion.difficulty && (
                  <p className="text-xs text-slate-500">Difficulty: {nextSuggestion.difficulty}</p>
                )}
                {nextSuggestion.reason && (
                  <p className="text-xs text-slate-400 leading-relaxed">Why now: {nextSuggestion.reason}</p>
                )}
                {nextSuggestion.recommended_resources?.length ? (
                  <ul className="text-xs text-slate-500 space-y-1">
                    {nextSuggestion.recommended_resources.slice(0, 3).map((resource, idx) => (
                      <li key={`${resource.title || resource.type || idx}-${idx}`} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="truncate">
                          {resource.title || resource.type || 'Resource'}{resource.url ? ' ↗' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-3">
                Upload your resume and run the AI analysis so Spark can queue a personalised next step.
              </p>
            )}
            <Button onClick={() => navigate('/learning')} className="mt-5 w-full bg-brand-blue text-white hover:bg-brand-blue/90">
              Go to learning path
            </Button>
          </Card>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid md:grid-cols-[1.7fr_1fr] gap-6">
            <Card className="bg-white/85 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                  <TrendingUp className="h-4 w-4 text-brand-purple" /> Trending market skills
                </div>
                <span className="text-xs text-slate-400">Spark rank · Last refresh</span>
              </div>
              {trendingSkills.length ? (
                <ul className="space-y-3">
                  {trendingSkills.slice(0, 8).map((skill, idx) => (
                    <li key={`${skill.name}-${idx}`} className="flex items-center justify-between rounded-xl border border-slate-200/40 dark:border-slate-800/50 px-4 py-3 bg-white/60 dark:bg-slate-900/60">
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">#{skill.rank} · {skill.name}</div>
                        {typeof skill.score === 'number' && (
                          <p className="text-xs text-slate-500 mt-1">Trend score: {skill.score.toFixed(1)}</p>
                        )}
                        {typeof skill.growth === 'number' && (
                          <p className="text-xs text-emerald-400">Growth: {skill.growth > 0 ? '+' : ''}{skill.growth.toFixed(1)}%</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-slate-500">
                  <Sparkles className="h-6 w-6 mb-3 text-brand-purple" />
                  <p>{sparkMessage || 'No market intelligence yet. Trigger the Spark pipeline to populate fresh skill trends.'}</p>
                </div>
              )}
            </Card>

            <Card className="bg-white/85 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <Target className="h-4 w-4 text-brand-blue" /> Top skill gaps
              </div>
              {missingSkills.length ? (
                <div className="flex flex-wrap gap-2">
                  {missingSkills.slice(0, 12).map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className={`px-3 py-1 rounded-full text-xs font-medium border border-white/20 ${chipColors[idx % chipColors.length]}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No personalised gaps yet. Upload a resume to let Spark detect missing keywords.</p>
              )}

              <Button
                variant="ghost"
                className="mt-6 w-full border border-brand-blue/40 text-brand-blue hover:bg-brand-blue/10"
                onClick={() => navigate('/resume')}
              >
                Run resume intelligence
              </Button>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/85 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <Flame className="h-4 w-4 text-orange-500" /> Momentum badges
              </div>
              {badges.length ? (
                <ul className="space-y-2 text-sm text-slate-500">
                  {badges.map((badge, idx) => (
                    <li key={`${badge}-${idx}`} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{badge}</span>
                    </li>
              ))}
            </ul>
              ) : (
                <p className="text-sm text-slate-500">Complete quizzes, coding tracks, and projects to start collecting XP badges.</p>
              )}
          </Card>

            <Card className="bg-white/85 dark:bg-slate-900/75 border border-slate-200/50 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
                <Compass className="h-4 w-4 text-brand-purple" /> What Spark suggests next
              </div>
              {nextSuggestion ? (
                <div className="space-y-3 text-sm text-slate-500">
                  <p>
                    Focus on <span className="font-semibold text-brand-blue">{nextSuggestion.skill}</span>
                    {nextSuggestion.difficulty ? ` · ${nextSuggestion.difficulty}` : ''}
                  </p>
                  {nextSuggestion.reason && <p className="text-xs text-slate-400">Because: {nextSuggestion.reason}</p>}
                  {nextSuggestion.recommended_resources?.length ? (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quick resources</p>
                      <ul className="space-y-1 text-xs text-brand-blue">
                        {nextSuggestion.recommended_resources.slice(0, 3).map((resource, idx) => (
                          <li key={`${resource.title || resource.type || idx}-link-${idx}`}>
                            {resource.url ? (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {resource.title || resource.type || resource.url}
                              </a>
                            ) : (
                              resource.title || resource.type || 'Recommended resource'
                            )}
                          </li>
              ))}
            </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Spark will personalise this once you complete coding challenges and resume analysis.
                </p>
              )}

              <Button
                variant="ghost"
                className="mt-6 w-full border border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10"
                onClick={() => navigate('/coding')}
              >
                Open coding practice
              </Button>
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}


