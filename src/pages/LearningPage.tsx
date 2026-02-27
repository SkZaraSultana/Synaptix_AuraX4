import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, Check, Clock, ExternalLink, GraduationCap, ListChecks, Play, Target } from 'lucide-react'

import { useDomain, domainLabelFromKey, domainKeyFromLabel } from '../contexts/DomainProvider'
import { useLearningPlanStore } from '../store/learningPlan'
import { getLearningPath, getDomainResources, getCertifications, getDomainProjects, trackProgress, getTrendingSkills, getSkillGap } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type LearningStep = {
  skill: string
  tag: string
  duration: string
  mini_task: string
}

type ResourceItem = {
  domain: string
  skillTag: string
  videoUrl: string
  videoTitle: string
  courseUrl: string
  courseTitle: string
  difficulty: string
  duration: string
}

type SkillCard = {
  key: string
  skill: string
  miniTask: string
  timeRequired: string
  video?: { title: string; url: string }
  course?: { title: string; url: string }
  difficulty?: string
  sourceReason?: string
}

const normalizeSkill = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_')

const LearningPage: React.FC = () => {
  const { domain, setDomain } = useDomain()
  const planStore = useLearningPlanStore((state) => state)
  const {
    domainLabel: planDomainLabel,
    skills: planSkills,
    missingSkills: planMissingSkills,
    atsScore,
    hasPlan,
    timeline: planTimeline,
    projects: planProjects,
    resumeKeywords,
    trendingHighDemand,
    trendingEmerging,
    certifications: planCertifications,
  } = planStore
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [selectedCert, setSelectedCert] = useState<any | null>(null)

  useEffect(() => {
    if (planDomainLabel) {
      const derived = domainKeyFromLabel(planDomainLabel)
      if (derived !== domain) {
        setDomain(derived)
      }
    }
  }, [planDomainLabel, domain, setDomain])

  const planMatchesDomain = Boolean(planDomainLabel && domainKeyFromLabel(planDomainLabel) === domain)
  const activePlan = hasPlan && planMatchesDomain
  const displayDomainLabel = planMatchesDomain ? planDomainLabel! : domainLabelFromKey(domain)

  const {
    data: pathData,
    isLoading: loadingPath,
    isError: pathError,
  } = useQuery({
    queryKey: ['learningPath', displayDomainLabel],
    queryFn: () => getLearningPath(displayDomainLabel).then(res => res.data),
    enabled: Boolean(displayDomainLabel) && !activePlan,
    retry: false,
  })

  const {
    data: resourceData,
    isLoading: loadingResources,
  } = useQuery({
    queryKey: ['resources', displayDomainLabel],
    queryFn: () => getDomainResources(displayDomainLabel).then(res => res.data),
    enabled: Boolean(displayDomainLabel) && !activePlan,
    retry: false,
  })

  const {
    data: certificationData,
    isLoading: loadingCerts,
  } = useQuery({
    queryKey: ['certifications', displayDomainLabel],
    queryFn: () => getCertifications(displayDomainLabel).then(res => res.data),
    enabled: Boolean(displayDomainLabel) && !activePlan,
    retry: false,
    onError: () => toast.error('No certifications available yet for this domain.'),
  })

  const {
    data: projectsData,
    isLoading: loadingProjects,
  } = useQuery({
    queryKey: ['projects', displayDomainLabel],
    queryFn: () => getDomainProjects(displayDomainLabel).then(res => res.data),
    enabled: Boolean(displayDomainLabel) && !activePlan,
    retry: false,
  })

  const resourceMap = useMemo(() => {
    const map = new Map<string, ResourceItem>()
    if (resourceData?.resources) {
      resourceData.resources.forEach((item: ResourceItem) => {
        map.set(item.skillTag.toLowerCase(), item)
        map.set(normalizeSkill(item.skillTag), item)
      })
    }
    return map
  }, [resourceData])

  const trendingSparkQuery = useQuery({
    queryKey: ['sparkTrending', displayDomainLabel],
    queryFn: () => getTrendingSkills({ domain: displayDomainLabel }).then((res) => res.data.skills),
    enabled: Boolean(displayDomainLabel),
  })

  const skillGapQuery = useQuery({
    queryKey: ['sparkSkillGap', displayDomainLabel],
    queryFn: () => getSkillGap({ domain: displayDomainLabel }).then((res) => res.data.missing_skills),
    enabled: Boolean(displayDomainLabel) && !activePlan,
  })

  const computedPathData = activePlan ? { steps: [], projects: [] } : (pathData || { steps: [], projects: [] })

  const steps: LearningStep[] = computedPathData.steps || []
  const fallbackCertifications = certificationData?.certifications || []
  const projectsFromApi = projectsData || []
  const certifications = activePlan ? planCertifications : fallbackCertifications
  const roadmapProjects = activePlan ? planProjects : projectsFromApi

  const getResourceForSkill = (skillName: string) => {
    const normalized = normalizeSkill(skillName)
    return resourceMap.get(normalized) || resourceMap.get(skillName.toLowerCase())
  }

const skillCards: SkillCard[] = useMemo(() => {
  const buildCardForSkill = (skillName: string, overrides?: { miniTask?: string; duration?: string; planStep?: PlanStep }) => {
    const normalizedSkill = normalizeSkill(skillName)
    const matchedStep = steps.find((step) => normalizeSkill(step.tag || step.skill) === normalizedSkill)
    const resource = getResourceForSkill(matchedStep?.tag || skillName)
    const planResource = planSkills.find((item) => normalizeSkill(item.skill) === normalizedSkill)
    const planStep = overrides?.planStep

    const videoRecommendation =
      (planStep?.video as any) ||
      planResource?.resources.find((res) => res.source?.toLowerCase().includes('youtube'))
    const courseRecommendation =
      (planStep?.course as any) ||
      planResource?.resources.find((res) => res.source && !res.source.toLowerCase().includes('youtube'))

    return {
      key: planStep ? `${planStep.order}_${normalizedSkill}` : matchedStep?.tag || normalizedSkill,
      skill: skillName,
      miniTask: planStep?.miniTask
        || overrides?.miniTask
        || matchedStep?.mini_task
        || `Complete one practice challenge focused on ${skillName}.`,
      timeRequired: planStep?.duration
        || overrides?.duration
        || matchedStep?.duration
        || courseRecommendation?.estimated_time
        || videoRecommendation?.estimated_time
        || resource?.duration
        || 'Self-paced',
      video: planStep?.video
        ? { title: planStep.video.title, url: planStep.video.url }
        : resource
          ? { title: resource.videoTitle, url: resource.videoUrl }
          : videoRecommendation
            ? { title: videoRecommendation.title, url: videoRecommendation.url }
            : undefined,
      course: planStep?.course
        ? { title: planStep.course.title, url: planStep.course.url }
        : resource
          ? { title: resource.courseTitle, url: resource.courseUrl }
          : courseRecommendation
            ? { title: courseRecommendation.title, url: courseRecommendation.url }
            : undefined,
      difficulty: resource?.difficulty || courseRecommendation?.level,
      sourceReason: courseRecommendation?.reason || videoRecommendation?.reason,
    }
  }

  if (activePlan && planTimeline.length > 0) {
    return planTimeline.map((step) =>
      buildCardForSkill(step.skill, { miniTask: step.miniTask, duration: step.duration, planStep: step })
    )
  }

  if (activePlan && planSkills.length === 0 && planMissingSkills.length > 0) {
    return planMissingSkills.map((skill) => buildCardForSkill(skill))
  }

  if (activePlan && planSkills.length === 0) {
    return steps.map((step) =>
      buildCardForSkill(step.skill, { miniTask: step.mini_task, duration: step.duration })
    )
  }

  if (activePlan) {
    const cards = planSkills.map((planItem) => buildCardForSkill(planItem.skill))

    const keys = new Set<string>()
    return cards.filter((card) => {
      if (!card.key) return false
      if (keys.has(card.key)) return false
      keys.add(card.key)
      return true
    })
  }

  return steps.map((step) =>
    buildCardForSkill(step.skill, { miniTask: step.mini_task, duration: step.duration })
  )
}, [activePlan, planSkills, planTimeline, planMissingSkills, steps, resourceMap])

  const showLoading = !displayDomainLabel || (loadingPath && !activePlan)
  const showFallbackMessage = !activePlan && !showLoading && (pathError || (!pathData && steps.length === 0))

  if (showLoading) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const handleToggleSkill = async (card: SkillCard) => {
    const next = !completed[card.key]
    setCompleted((prev) => ({ ...prev, [card.key]: next }))
    try {
      await trackProgress('learning_skill', {
        skill: card.skill,
        completed: next,
        domain: displayDomainLabel
      })
    } catch (error) {
      console.error('Failed to log progress:', error)
      setCompleted((prev) => ({ ...prev, [card.key]: !next }))
      toast.error('Unable to update progress right now.')
    }
  }

  const openLink = (url: string) => window.open(url, '_blank', 'noopener')

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {!activePlan && (
          <Card className="border border-brand-blue/30 bg-brand-blue/10 text-brand-blue px-6 py-4">
            <h2 className="font-semibold text-lg">Personalize this track with your resume</h2>
            <p className="text-sm text-brand-blue/80">
              You’re viewing the curated {displayDomainLabel} path. Upload a resume and run the full AI analysis to tailor every skill card, certification, and project to your profile.
            </p>
          </Card>
        )}

        {showFallbackMessage && (
          <Card className="border border-red-200 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-6 py-4">
            We haven’t curated this domain yet. Please upload a resume and run the AI analysis to generate a personalized plan.
          </Card>
        )}

        <header className="bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 border border-brand-blue/30 rounded-3xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-brand-blue/80 mb-2">Guided Learning Track</p>
              <h1 className="font-display text-4xl mb-3">
                Bridge your {displayDomainLabel} skill gaps with curated resources
              </h1>
              <p className="text-slate-200 max-w-2xl">
                Every step below maps directly to the gaps identified in your resume. Watch the exact explainer, follow the best long-form course, complete the mini task, and log progress as you acquire each skill.
              </p>
              {planMissingSkills?.length > 0 && activePlan && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {planMissingSkills.map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {resumeKeywords.length > 0 && activePlan && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-brand-purple/70 mb-2">Keywords to weave into your resume</p>
                  <div className="flex flex-wrap gap-2">
                    {resumeKeywords.slice(0, 8).map((kw) => (
                      <span key={kw} className="px-2 py-1 rounded-md bg-brand-purple/15 text-brand-purple text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(trendingHighDemand.length > 0 || trendingEmerging.length > 0) && activePlan && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {trendingHighDemand.length > 0 && (
                    <Card className="bg-white/15 border-white/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-brand-blue/70 mb-1">High-demand focus areas</p>
                      <div className="flex flex-wrap gap-2">
                        {trendingHighDemand.slice(0, 6).map((skill) => (
                          <span key={skill} className="px-2 py-1 rounded-md bg-brand-blue/15 text-brand-blue text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                  {trendingEmerging.length > 0 && (
                    <Card className="bg-white/15 border-white/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-brand-purple/70 mb-1">Emerging topics to explore</p>
                      <div className="flex flex-wrap gap-2">
                        {trendingEmerging.slice(0, 6).map((skill) => (
                          <span key={skill} className="px-2 py-1 rounded-md bg-brand-purple/15 text-brand-purple text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {!activePlan && !skillGapQuery.isLoading && skillGapQuery.data?.length ? (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wide text-brand-blue/70 mb-2">Spark-detected skill gaps</p>
                  <div className="flex flex-wrap gap-2">
                    {skillGapQuery.data.slice(0, 6).map((skill) => (
                      <span key={skill} className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!activePlan && !trendingSparkQuery.isLoading && trendingSparkQuery.data?.length ? (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wide text-brand-purple/70 mb-2">Trending in the job market</p>
                  <div className="flex flex-wrap gap-2">
                    {trendingSparkQuery.data.slice(0, 6).map((item: any, idx: number) => (
                      <span key={`${item.token || item.skill || item.name || idx}`} className="px-3 py-1 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-medium">
                        {item.token || item.skill || item.name || item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-white/90 dark:bg-slate-900/80 px-6 py-5 border border-brand-blue/40">
                <div className="text-sm uppercase tracking-wide text-brand-purple/70 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Current Focus
                </div>
                <div className="text-2xl font-semibold text-brand-blue">
                  {skillCards[0]?.skill || 'Core Foundations'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Start with the first skill card below. Mark it complete once you finish the mini task.
                </p>
              </Card>
              {typeof atsScore === 'number' && (
                <Card className="bg-white/90 dark:bg-slate-900/80 px-6 py-5 border border-brand-purple/40">
                  <div className="text-sm uppercase tracking-wide text-brand-purple/70 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Latest ATS Score
                  </div>
                  <div className="text-2xl font-semibold text-brand-purple">
                    {atsScore}/100
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Each completed skill and certification below is estimated to raise your score by 5-8%.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </header>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-brand-blue" />
              Your Skill Gap
            </h2>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Complete the top section first</span>
          </div>
          {loadingResources && planSkills.length === 0 ? (
            <div className="flex items-center gap-3 text-slate-400">
              <LoadingSpinner /> Loading resources...
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {skillCards.map((card) => (
                <Card key={card.key} className="h-full bg-white/85 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand-blue/70 mb-1">Skill Focus</p>
                      <h3 className="font-semibold text-lg">{card.skill}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-brand-purple/10 text-brand-purple">
                      {card.timeRequired}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-3 min-h-[56px]">{card.miniTask}</p>
                  <div className="mt-4 space-y-3">
                    {card.video && (
                      <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/50 p-3 bg-slate-50 dark:bg-slate-900/50">
                        <div className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-2">
                          <Play className="w-4 h-4 text-brand-blue" /> Best Explainer Video
                        </div>
                        <button
                          onClick={() => openLink(card.video!.url)}
                          className="text-left text-brand-blue hover:underline text-sm font-medium"
                        >
                          {card.video.title}
                        </button>
                        {card.difficulty && (
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                            <span>{card.difficulty}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {card.course && (
                      <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/50 p-3 bg-slate-50 dark:bg-slate-900/50">
                        <div className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-brand-purple" /> Best Course / Playlist
                        </div>
                        <button
                          onClick={() => openLink(card.course!.url)}
                          className="text-left text-brand-blue hover:underline text-sm font-medium"
                        >
                          {card.course.title}
                        </button>
                        {card.sourceReason && (
                          <p className="mt-2 text-xs text-slate-500">{card.sourceReason}</p>
                        )}
                      </div>
          )}
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className={`text-xs font-medium ${completed[card.key] ? 'text-brand-blue' : 'text-slate-400'}`}>
                      {completed[card.key] ? 'Marked complete' : 'Mark as completed'}
                    </span>
                    <button
                      onClick={() => handleToggleSkill(card)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        completed[card.key]
                          ? 'bg-brand-blue text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800/60 text-slate-600 hover:bg-slate-300/60'
                      }`}
                    >
                      {completed[card.key] ? 'Completed' : 'Toggle Progress'}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {planTimeline.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-purple" />
                Suggested 4-Week Timeline
              </h2>
              <p className="text-sm text-slate-400">Follow each milestone and log your progress.</p>
            </div>
            <div className="grid gap-4">
              {planTimeline.map((step) => (
                <Card key={step.order} className="bg-white/85 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/60">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-blue">Step {step.order}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue">
                          {step.duration || 'Self-paced'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-dark-text-primary mt-1">{step.skill}</h3>
                      <p className="text-sm text-slate-500 mt-2">{step.miniTask}</p>
                      {step.milestone && (
                        <p className="text-xs text-brand-purple mt-2">{step.milestone}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {step.video && (
                        <Button
                          variant="ghost"
                          className="border border-brand-blue text-brand-blue"
                          onClick={() => openLink(step.video!.url)}
                        >
                          Watch: {step.video.title}
                        </Button>
                      )}
                      {step.course && (
                        <Button
                          variant="ghost"
                          className="border border-brand-purple text-brand-purple"
                          onClick={() => openLink(step.course!.url)}
                        >
                          Deep Dive: {step.course.title}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
          )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-purple" />
              Roadmap Path
            </h2>
            <p className="text-sm text-slate-400">Follow this order to stack skills smoothly.</p>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-blue/50 to-brand-purple/50" />
            <div className="space-y-6">
              {steps.map((step, index) => (
            <motion.div
                  key={step.tag}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="absolute -left-4 top-3 w-3 h-3 rounded-full bg-brand-blue shadow-lg" />
                  <Card className="pl-6 pr-4 py-4 bg-white/80 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                        <h3 className="text-lg font-semibold">{step.skill}</h3>
                      </div>
                      <div className="text-xs text-slate-400">
                        {completed[step.tag] ? 'Completed' : 'In Progress'}
                      </div>
                    </div>
                  </Card>
            </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-brand-blue" />
              Certification Roadmap
            </h2>
            <span className="text-sm text-slate-400">Click a certification to view official exam plan.</span>
          </div>
          {(loadingCerts && certifications.length === 0) ? (
            <div className="flex items-center gap-3 text-slate-400">
              <LoadingSpinner /> Loading certification roadmap...
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {certifications.map((cert: any) => (
                <Card key={cert.name} className="bg-white/85 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand-purple/70 mb-1">Milestone</p>
                      <h3 className="text-xl font-semibold">{cert.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">Exam Code: {cert.examCode}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-brand-blue/10 text-brand-blue font-medium">
                      {cert.timeToPrepare}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    {cert.weightage?.slice(0, 4).map((item: any) => (
                      <div key={item.topic} className="flex justify-between">
                        <span>{item.topic}</span>
                        <span className="text-slate-400">{item.weight}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button variant="ghost" className="border border-brand-purple text-brand-purple" onClick={() => setSelectedCert(cert)}>
                      View Certification Details
                    </Button>
                    {cert.officialUrl ? (
                      <Button onClick={() => openLink(cert.officialUrl)}>Take Certification</Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-brand-blue" />
              Portfolio Builders
            </h2>
            <p className="text-sm text-slate-400">Ship these projects to prove mastery.</p>
          </div>
          {loadingProjects && roadmapProjects.length === 0 ? (
            <div className="flex items-center gap-3 text-slate-400">
              <LoadingSpinner /> Loading projects...
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {roadmapProjects.map((project: any) => (
                <Card key={project.title} className="bg-white/85 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand-blue/60 mb-1">{project.difficulty}</p>
                      <h3 className="text-lg font-semibold">{project.title}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-brand-blue/10 text-brand-blue">
                      {project.duration}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-3">{project.description}</p>
                  {project.url ? (
                    <Button variant="ghost" className="mt-5 border border-brand-blue text-brand-blue" onClick={() => openLink(project.url)}>
                      View Project Brief
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">
                      Outline your own brief focusing on measurable outcomes for {project.title}.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedCert && (
            <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-40 overflow-y-auto"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-purple/70">Certification Detail</p>
                  <h3 className="text-2xl font-semibold mt-1">{selectedCert.name}</h3>
                  {selectedCert.examCode && (
                    <p className="text-sm text-slate-500 mt-1">Exam Code: {selectedCert.examCode}</p>
                  )}
                  {(selectedCert.provider || selectedCert.level) && (
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedCert.provider && <span>{selectedCert.provider}</span>}
                      {selectedCert.level && <span> • {selectedCert.level}</span>}
                      {selectedCert.timeToPrepare && <span> • {selectedCert.timeToPrepare}</span>}
                    </p>
                  )}
                </div>
                <Button variant="ghost" onClick={() => setSelectedCert(null)} className="text-slate-500">
                  Close
                </Button>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Weightage Topics</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  {selectedCert.weightage?.map((item: any) => (
                    <li key={item.topic} className="flex justify-between bg-slate-50 dark:bg-slate-900/70 rounded-md px-3 py-2">
                      <span>{item.topic}</span>
                      <span className="text-slate-400">{item.weight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Best Prep Course</h4>
                {selectedCert.prepCourseUrl ? (
                  <Button variant="ghost" className="border border-brand-blue text-brand-blue w-full" onClick={() => openLink(selectedCert.prepCourseUrl)}>
                    Open Prep Course
                  </Button>
                ) : (
                  <p className="text-xs text-slate-400">
                    Use the skill cards above to source learning material before booking this exam.
                  </p>
                )}
              </div>
              {selectedCert.officialUrl && (
                <Button className="w-full" onClick={() => openLink(selectedCert.officialUrl)}>
                  Take Certification
                </Button>
              )}
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  )
}

export default LearningPage