import { create } from 'zustand'

type GamificationState = {
  xp: number
  badges: string[]
  lastUpdatedAt?: string
  addXp: (amount: number) => void
  mergeBadges: (badges: string[]) => void
  reset: () => void
}

export const useGamificationStore = create<GamificationState>((set) => ({
  xp: 0,
  badges: [],
  addXp: (amount) =>
    set((state) => ({
      xp: state.xp + amount,
      lastUpdatedAt: new Date().toISOString(),
    })),
  mergeBadges: (incoming) =>
    set((state) => ({
      badges: Array.from(new Set([...state.badges, ...incoming])),
      lastUpdatedAt: new Date().toISOString(),
    })),
  reset: () =>
    set({
      xp: 0,
      badges: [],
      lastUpdatedAt: undefined,
    }),
}))

