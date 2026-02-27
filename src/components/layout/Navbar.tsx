import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../ui/Button'
import useAppStore from '../../store/useAppStore'
import authStore from '../../store/auth'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/skill-dashboard', label: 'Skills' },
  { to: '/resume', label: 'Resume' },
  { to: '/learning', label: 'Learning' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/coding', label: 'Coding' },
  { to: '/projects', label: 'Projects' },
  { to: '/leaderboard', label: 'Leaderboard' }
]

export default function Navbar() {
  const dark = useAppStore(s => s.darkMode)
  const toggle = useAppStore(s => s.toggleDark)
  const user = authStore(s => s.user)
  const logout = authStore(s => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isHomePage = location.pathname === '/' || location.pathname === '/dashboard'
  const textColor = isHomePage ? 'text-white' : 'text-slate-600 dark:text-slate-300'
  const hoverColor = isHomePage ? 'hover:text-white/80' : 'hover:text-slate-900 dark:hover:text-white'

  function handleLogout() {
    logout()
    navigate('/login')
    setMobileOpen(false)
  }

  function handleNavClick() {
    setMobileOpen(false)
  }

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 z-40 backdrop-blur ${
        isHomePage 
          ? 'supports-[backdrop-filter]:bg-black/20 border-b border-white/10' 
          : 'supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/40 border-b'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/dashboard" className={`font-display text-xl flex items-center gap-2 ${textColor}`} onClick={handleNavClick}>
          ⚙️ RankRight
        </Link>

        <div className={`hidden md:flex items-center gap-4 text-sm ${textColor}`}>
          {links.map(link => (
            <Link key={link.to} to={link.to} className={`${hoverColor} transition`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="md:hidden">
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileOpen(prev => !prev)}
              className={`p-2 rounded-lg transition ${isHomePage ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className={`hidden md:flex p-2 rounded-lg ${isHomePage ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {dark ? '☀️' : '🌙'}
          </motion.button>

          <div className={`hidden md:flex items-center gap-2 text-sm ${textColor}`}>
            <span>👤 {user?.name}</span>
          </div>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className={`hidden md:inline-flex ${isHomePage ? 'text-white border-white/30 hover:bg-white/20' : ''}`}
          >
            Logout
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`md:hidden border-t ${isHomePage ? 'border-white/10 bg-black/75 text-white' : 'border-slate-200/60 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800/60'}`}
          >
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">👤 {user?.name}</span>
                <button
                  onClick={toggle}
                  className={`p-2 rounded-lg ${isHomePage ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  {dark ? '☀️' : '🌙'}
                </button>
              </div>

              <nav className="space-y-3">
                {links.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={handleNavClick}
                    className={`block text-base font-medium ${hoverColor}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className={`w-full ${isHomePage ? 'text-white border-white/30 hover:bg-white/20' : ''}`}
              >
                Logout
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}