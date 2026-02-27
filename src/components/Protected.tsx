import React from 'react'
import { Navigate } from 'react-router-dom'
import authStore from '../store/auth'

export default function Protected({ children }: { children: React.ReactNode }) {
  const token = authStore(s=>s.token)
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}


