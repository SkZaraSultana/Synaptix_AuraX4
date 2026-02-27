import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import ToastProvider from './components/ToastProvider'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Skills from './pages/Skills'
import ResumeBuilder from './pages/ResumeBuilder'
import Insights from './pages/Insights'
import Profile from './pages/Profile'
import PrivateRoute from './components/PrivateRoute'
import LearningPage from './pages/LearningPage'
import Projects from './pages/Projects'
import Quiz from './pages/Quiz'
import CodingPage from './pages/Coding'
import SkillDashboard from './pages/SkillDashboard'
import Leaderboard from './pages/Leaderboard'
import authStore from './store/auth'

export default function App() {
  const location = useLocation()
  const token = authStore(s => s.token)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 gradient-bg">
      {token && <Navbar />}
      <ToastProvider />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/skills"
              element={
                <PrivateRoute>
                  <Skills />
                </PrivateRoute>
              }
            />
            <Route
              path="/resume"
              element={
                <PrivateRoute>
                  <ResumeBuilder />
                </PrivateRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <PrivateRoute>
                  <Insights />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/learning"
              element={
                <PrivateRoute>
                  <LearningPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <PrivateRoute>
                  <Projects />
                </PrivateRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <PrivateRoute>
                  <Quiz />
                </PrivateRoute>
              }
            />
            <Route
              path="/coding"
              element={
                <PrivateRoute>
                  <CodingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/skill-dashboard"
              element={
                <PrivateRoute>
                  <SkillDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <PrivateRoute>
                  <Leaderboard />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
