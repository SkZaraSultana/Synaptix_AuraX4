import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import App from './App'
import { DomainProvider } from './contexts/DomainProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Suppress Recharts defaultProps warnings globally
const originalWarn = console.warn
const originalError = console.error

// Filter function for Recharts warnings
function shouldSuppress(message: any): boolean {
  if (!message) return false
  const msg = typeof message === 'string' ? message : String(message)
  return (
    msg.includes('defaultProps') ||
    msg.includes('XAxis') ||
    msg.includes('YAxis') ||
    msg.includes('RadialBar') ||
    msg.includes('Bar') && msg.includes('Support for defaultProps') ||
    msg.includes('Recharts')
  )
}

console.warn = (...args: any[]) => {
  if (shouldSuppress(args[0])) {
    return // Suppress Recharts warnings
  }
  originalWarn.apply(console, args)
}

console.error = (...args: any[]) => {
  if (shouldSuppress(args[0])) {
    return // Suppress Recharts errors too
  }
  originalError.apply(console, args)
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DomainProvider>
          <App />
        </DomainProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
