import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { registerUser } from '../lib/api'
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from '../lib/validation'
import { useUniversitySearch } from '../hooks/useUniversitySearch'

const DOMAINS = [
  'AI/ML',
  'Cybersecurity',
  'Data Science',
  'Web Development',
  'Cloud Computing',
  'IoT',
  'Robotics',
]

const INSTITUTION_TYPES = ['School', 'University']

// Generate years from current year to +6 years
const generateYears = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = 0; i <= 6; i++) {
    years.push((currentYear + i).toString())
  }
  return years
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [institutionType, setInstitutionType] = useState('University')
  const [college, setCollege] = useState('')
  const [collegeQuery, setCollegeQuery] = useState('')
  const [year, setYear] = useState('')
  const [domain, setDomain] = useState('')
  const [role, setRole] = useState<'student' | 'recruiter'>('student')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { universities, loading: searchLoading } = useUniversitySearch(collegeQuery)
  const years = generateYears()

  // Validation errors
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [collegeError, setCollegeError] = useState('')
  const [yearError, setYearError] = useState('')
  const [domainError, setDomainError] = useState('')

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function validateStep1(): boolean {
    const nameVal = validateName(name)
    const emailVal = validateEmail(email)
    const passwordVal = validatePassword(password)
    const confirmVal = validateConfirmPassword(password, confirmPassword)

    setNameError(nameVal.valid ? '' : nameVal.message || '')
    setEmailError(emailVal.valid ? '' : emailVal.message || '')
    setPasswordError(passwordVal.valid ? '' : passwordVal.message || '')
    setConfirmPasswordError(confirmVal.valid ? '' : confirmVal.message || '')

    return nameVal.valid && emailVal.valid && passwordVal.valid && confirmVal.valid
  }

  function validateStep2(): boolean {
    if (!college.trim()) {
      setCollegeError('Institution is required')
      return false
    }
    setCollegeError('')

    if (!year) {
      setYearError('Graduation year is required')
      return false
    }
    setYearError('')

    return true
  }

  function validateStep3(): boolean {
    if (!domain) {
      setDomainError('Please select a domain')
      return false
    }
    setDomainError('')
    return true
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    if (value) {
      const validation = validateName(value)
      setNameError(validation.valid ? '' : validation.message || '')
    } else {
      setNameError('')
    }
  }

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
    // Re-validate confirm password if it's filled
    if (confirmPassword) {
      const confirmVal = validateConfirmPassword(value, confirmPassword)
      setConfirmPasswordError(confirmVal.valid ? '' : confirmVal.message || '')
    }
  }

  function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setConfirmPassword(value)
    if (value) {
      const validation = validateConfirmPassword(password, value)
      setConfirmPasswordError(validation.valid ? '' : validation.message || '')
    } else {
      setConfirmPasswordError('')
    }
  }

  function handleCollegeSelect(uniName: string) {
    setCollege(uniName)
    setCollegeQuery(uniName)
    setShowDropdown(false)
    setCollegeError('')
  }

  async function handleSubmit() {
    if (!validateStep3()) return

    setLoading(true)
    try {
      await registerUser({ name, email, password, domain, college, year, role })
      toast.success('Registration successful!')
      setTimeout(() => {
        toast.success('Redirecting to login...')
        setTimeout(() => navigate('/login'), 1500)
      }, 1000)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const progress = ((step - 1) / 2) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden gradient-bg">
      {/* Floating gradients */}
      <motion.div
        className="absolute top-10 left-10 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl glass rounded-2xl shadow-2xl p-8"
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="font-display text-2xl">Create Your Account</h1>
            <span className="text-sm text-slate-600 dark:text-slate-400">Step {step} of 3</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-brand-blue to-brand-purple"
            />
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? 'bg-brand-blue text-white'
                      : s < step
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      s < step ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 rounded-lg border transition ${
                    nameError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
                  } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
                />
                {nameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                  >
                    {nameError}
                  </motion.p>
                )}
              </div>

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
                  placeholder="Create a strong password"
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
                <p className="mt-1 text-xs text-slate-500">
                  Must contain: uppercase, lowercase, number, special character (@$!%*?&)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <input
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  type="password"
                  placeholder="Re-enter your password"
                  className={`w-full px-4 py-3 rounded-lg border transition ${
                    confirmPasswordError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
                  } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
                />
                {confirmPasswordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                  >
                    {confirmPasswordError}
                  </motion.p>
                )}
              </div>

              <motion.button
                onClick={() => {
                  if (validateStep1()) setStep(2)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg font-medium text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Institution Type
                </label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  {INSTITUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {institutionType} Name
                </label>
                <input
                  ref={inputRef}
                  value={collegeQuery}
                  onChange={(e) => {
                    setCollegeQuery(e.target.value)
                    setShowDropdown(true)
                    setCollege(e.target.value)
                  }}
                  onFocus={() => setShowDropdown(collegeQuery.length >= 2)}
                  placeholder={`Enter ${institutionType.toLowerCase()} name`}
                  className={`w-full px-4 py-3 rounded-lg border transition ${
                    collegeError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
                  } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
                />
                {collegeError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                  >
                    {collegeError}
                  </motion.p>
                )}

                {/* University dropdown */}
                {showDropdown && collegeQuery.length >= 2 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {searchLoading && (
                      <div className="p-4 text-center text-sm text-slate-600">Searching...</div>
                    )}
                    {!searchLoading && universities.length === 0 && collegeQuery.length >= 2 && (
                      <div className="p-4 text-center text-sm text-slate-600">
                        No institutions found. You can enter manually.
                      </div>
                    )}
                    {universities.map((uni, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCollegeSelect(uni.name)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm"
                      >
                        <div className="font-medium">{uni.name}</div>
                        <div className="text-xs text-slate-500">{uni.country}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Graduation Year
                </label>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value)
                    setYearError('')
                  }}
                  className={`w-full px-4 py-3 rounded-lg border transition ${
                    yearError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue'
                  } bg-white dark:bg-slate-800 focus:outline-none focus:ring-2`}
                >
                  <option value="">Select graduation year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {yearError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                  >
                    {yearError}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setStep(1)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-lg font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Back
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (validateStep2()) setStep(3)
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Select Your Domain
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DOMAINS.map((d) => (
                    <motion.button
                      key={d}
                      onClick={() => {
                        setDomain(d)
                        setDomainError('')
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-4 rounded-xl border-2 transition text-sm font-medium ${
                        domain === d
                          ? 'bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 border-brand-blue dark:border-brand-blue'
                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-blue/50'
                      }`}
                    >
                      {d}
                    </motion.button>
                  ))}
                </div>
                {domainError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                  >
                    {domainError}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Choose Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['student', 'recruiter'].map((r) => (
                    <motion.button
                      key={r}
                      onClick={() => setRole(r as 'student' | 'recruiter')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-xl border-2 text-sm font-medium capitalize ${
                        role === r
                          ? 'bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 border-brand-blue dark:border-brand-blue'
                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-blue/50'
                      }`}
                    >
                      {r}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setStep(2)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-lg font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Back
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={loading || !domain}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="flex-1 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <motion.button
              onClick={() => navigate('/login')}
              className="text-brand-blue font-medium hover:underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login here
            </motion.button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
