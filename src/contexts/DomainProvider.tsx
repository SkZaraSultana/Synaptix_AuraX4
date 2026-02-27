import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import authStore from '../store/auth'
import { useLearningPlanStore } from '../store/learningPlan'

export type DomainKey = 'ai_ml' | 'cybersec' | 'data' | 'web' | 'cloud' | 'iot' | 'robotics'

const DOMAIN_LABELS: Record<DomainKey, string> = {
  ai_ml: 'AI/ML',
  cybersec: 'Cybersecurity',
  data: 'Data Science',
  web: 'Web Development',
  cloud: 'Cloud Computing',
  iot: 'IoT',
  robotics: 'Robotics'
}

const LABEL_TO_KEY = Object.entries(DOMAIN_LABELS).reduce<Record<string, DomainKey>>((acc, [key, label]) => {
  acc[label.toLowerCase()] = key as DomainKey
  acc[label.replace('/', '').toLowerCase()] = key as DomainKey
  return acc
}, {})

export type DomainFilters = {
  role: 'student' | 'professional' | 'career_switcher'
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: 'short' | 'medium' | 'long'
}

const DEFAULT_FILTERS: DomainFilters = {
  role: 'student',
  level: 'beginner',
  duration: 'short'
}

type DomainContextValue = {
  domain: DomainKey
  domainLabel: string
  setDomain: (domain: DomainKey) => void
  setDomainByLabel: (label: string) => void
  filters: DomainFilters
  setFilters: (filters: Partial<DomainFilters>) => void
}

const DomainContext = createContext<DomainContextValue | undefined>(undefined)

const toDomainKey = (label?: string | null): DomainKey => {
  if (!label) return 'ai_ml'
  const normalized = label.trim().toLowerCase()
  return LABEL_TO_KEY[normalized] || LABEL_TO_KEY[normalized.replace(/\s+/g, '')] || 'ai_ml'
}

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [domain, setDomainState] = useState<DomainKey>(() => {
    const currentUser = authStore.getState().user
    return toDomainKey(currentUser?.domain)
  })
  const [filters, setFiltersState] = useState<DomainFilters>(DEFAULT_FILTERS)

  useEffect(() => {
    const planState = useLearningPlanStore.getState()
    if (planState.domainLabel && domainKeyFromLabel(planState.domainLabel) !== domain) {
      useLearningPlanStore.getState().clear()
    }
  }, [domain])

  useEffect(() => {
    const unsubscribe = authStore.subscribe(
      (state) => state.user?.domain,
      (newDomain) => {
        if (newDomain) {
          setDomainState(toDomainKey(newDomain))
        }
      }
    )
    return unsubscribe
  }, [])

  const value = useMemo<DomainContextValue>(() => ({
    domain,
    domainLabel: DOMAIN_LABELS[domain],
    setDomain: (next) => setDomainState(next),
    setDomainByLabel: (label) => setDomainState(toDomainKey(label)),
    filters,
    setFilters: (next) => setFiltersState((prev) => ({ ...prev, ...next }))
  }), [domain, filters])

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  )
}

export const useDomain = (): DomainContextValue => {
  const ctx = useContext(DomainContext)
  if (!ctx) {
    throw new Error('useDomain must be used within a DomainProvider')
  }
  return ctx
}

export const domainLabelFromKey = (key: DomainKey): string => DOMAIN_LABELS[key]
export const domainKeyFromLabel = (label: string): DomainKey => toDomainKey(label)


