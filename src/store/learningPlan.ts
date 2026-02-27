import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SkillResource = {
  skill: string
  resources: Array<{
    title: string
    url: string
    source: string
    estimated_time?: string
    level?: string
    reason?: string
  }>
}

export type PlanResource = {
  title: string
  url: string
  source?: string
  estimated_time?: string
  level?: string
  reason?: string
}

export type PlanStep = {
  order: number
  skill: string
  focus: string
  miniTask: string
  duration?: string
  video?: PlanResource | null
  course?: PlanResource | null
  milestone?: string
}

export type ProjectIdea = {
  title: string
  description: string
  url?: string
  difficulty?: string
  duration?: string
}

type LearningPlanState = {
  domainLabel: string | null
  skills: SkillResource[]
  missingSkills: string[]
  atsScore?: number
  hasPlan: boolean
  timeline: PlanStep[]
  projects: ProjectIdea[]
  resumeKeywords: string[]
  trendingHighDemand: string[]
  trendingEmerging: string[]
  certifications: Array<{
    name: string
    provider?: string
    level?: string
    examCode?: string
    officialUrl?: string
    prepCourseUrl?: string
    timeToPrepare?: string
    weightage?: Array<{ topic: string; weight?: string }>
  }>
  setFromAnalysis: (
    domain: string,
    skills: SkillResource[],
    options?: {
      missingSkills?: string[]
      atsScore?: number
      timeline?: PlanStep[]
      projects?: ProjectIdea[]
      resumeKeywords?: string[]
      trendingHighDemand?: string[]
      trendingEmerging?: string[]
      certifications?: LearningPlanState['certifications']
    }
  ) => void
  clear: () => void
}

export const useLearningPlanStore = create<LearningPlanState>()(
  persist(
    (set) => ({
      domainLabel: null,
      skills: [],
      missingSkills: [],
      atsScore: undefined,
      hasPlan: false,
       timeline: [],
      projects: [],
      resumeKeywords: [],
      trendingHighDemand: [],
      trendingEmerging: [],
      certifications: [],
      setFromAnalysis: (domain, skills, options) => {
        set({
          domainLabel: domain,
          skills,
          missingSkills: options?.missingSkills ?? skills.map((item) => item.skill),
          atsScore: options?.atsScore,
          hasPlan: true,
          timeline: options?.timeline ?? [],
          projects: options?.projects ?? [],
          resumeKeywords: options?.resumeKeywords ?? [],
          trendingHighDemand: options?.trendingHighDemand ?? [],
          trendingEmerging: options?.trendingEmerging ?? [],
          certifications: options?.certifications ?? []
        })
      },
      clear: () => set({
        domainLabel: null,
        skills: [],
        missingSkills: [],
        atsScore: undefined,
        hasPlan: false,
        timeline: [],
        projects: [],
        resumeKeywords: [],
        trendingHighDemand: [],
        trendingEmerging: [],
        certifications: []
      })
    }),
    {
      name: 'rankright-learning-plan'
    }
  )
)

