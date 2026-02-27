import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { loginUser, getProfile } from '../lib/api'
import authStore from '../store/auth'
import { validateEmail, validatePassword } from '../lib/validation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setToken = authStore(s => s.setToken)
  const setUser = authStore(s => s.setUser)

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setEmail(value)
    if (value) {
      const validation = validateEmail(value)
      setEmailError(validation.valid ? '' : validation.message || '')
    } else {
      setEmailError('')
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setPassword(value)
    if (value) {
      const validation = validatePassword(value)
      setPasswordError(validation.valid ? '' : validation.message || '')
    } else {
      setPasswordError('')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    // Validate fields
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    
    setEmailError(emailValidation.valid ? '' : emailValidation.message || '')
    setPasswordError(passwordValidation.valid ? '' : passwordValidation.message || '')
    
    if (!emailValidation.valid || !passwordValidation.valid) {
      return
    }

    setLoading(true)
    try {
      console.log('Attempting login with:', { email, passwordLength: password.length })
      
      const loginResponse = await loginUser({ email, password })
      console.log('Login response:', loginResponse)
      
      if (!loginResponse?.data?.access_token) {
        throw new Error('No access token received')
      }
      
      setToken(loginResponse.data.access_token)
      
      // Fetch profile
      const profResponse = await getProfile()
      console.log('Profile response:', profResponse)
      
      if (profResponse?.data) {
        setUser(profResponse.data)
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        throw new Error('Failed to fetch profile')
      }
    } catch (e: any) {
      console.error('Login error:', e)
      const errorMessage = e?.response?.data?.detail || e?.message || 'Login failed'
      
      // More specific error messages
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('401')) {
        toast.error('Invalid email or password. Please check your credentials.')
      } else if (errorMessage.includes('404')) {
        toast.error('User not found. Please register first.')
      } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
        toast.error('Connection error. Please check if the backend server is running.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden gradient-bg">
      {/* Floating gradient blobs */}
      <motion.div
        className="absolute top-20 left-20 w-72 h-72 bg-brand-purple/10 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl"
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md glass rounded-2xl shadow-2xl p-8"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
            GradGear
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Sign in to your account</p>
        </motion.div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <input
              value={email}
              onChange={handleEmailChange}
              type="email"
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg border transition ${
                emailError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
              } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
            />
            {emailError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {emailError}
              </motion.p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              value={password}
              onChange={handlePasswordChange}
              type="password"
              placeholder="Enter your password"
              className={`w-full px-4 py-3 rounded-lg border transition ${
                passwordError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
              } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
            />
            {passwordError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {passwordError}
              </motion.p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading || !!emailError || !!passwordError || !email || !password}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <motion.button
              onClick={() => navigate('/register')}
              className="text-brand-blue font-medium hover:underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Register here
            </motion.button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
