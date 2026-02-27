import { create } from 'zustand'

type AppState = {
  darkMode: boolean
  toggleDark: () => void
}

const useAppStore = create<AppState>((set) => ({
  darkMode: false,
  toggleDark: () => set(s => {
    const next = !s.darkMode
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    return { darkMode: next }
  })
}))

export default useAppStore


