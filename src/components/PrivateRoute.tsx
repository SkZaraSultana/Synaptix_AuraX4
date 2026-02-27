import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import authStore from '../store/auth'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = authStore(s => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

