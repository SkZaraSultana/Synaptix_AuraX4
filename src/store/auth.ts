import { create } from 'zustand'

type User = {
  id: number
  name: string
  email: string
  domain?: string
  role?: 'student' | 'recruiter'
  gpa?: number
  experience_years?: number
  demographic_group?: string
}

type AuthState = {
  token: string | null
  user: User | null
  setToken: (t: string | null) => void
  setUser: (u: User | null) => void
  logout: () => void
}

const authStore = create<AuthState>((set) => ({
  token: (typeof window !== 'undefined' ? localStorage.getItem('gg_token') : null),
  user: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('gg_user') || 'null') : null),
  setToken: (t) => {
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem('gg_token', t)
      else localStorage.removeItem('gg_token')
    }
    set({ token: t })
  },
  setUser: (u) => {
    if (typeof window !== 'undefined') {
      if (u) localStorage.setItem('gg_user', JSON.stringify(u))
      else localStorage.removeItem('gg_user')
    }
    set({ user: u })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gg_token')
      localStorage.removeItem('gg_user')
    }
    set({ token: null, user: null })
  },
}))

export default authStore


