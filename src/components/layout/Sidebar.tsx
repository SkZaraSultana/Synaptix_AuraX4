import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const items = [
  { to: '/dashboard', label: 'Home' },
  { to: '/skills', label: 'My Skills' },
  { to: '/projects', label: 'Projects' },
  { to: '/resume', label: 'Resume' },
  { to: '/insights', label: 'Insights' },
  { to: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="hidden md:block w-60 p-4 space-y-2">
      {items.map(it => (
        <Link key={it.to} to={it.to} className={`block px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${pathname===it.to ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
          {it.label}
        </Link>
      ))}
    </aside>
  )
}


