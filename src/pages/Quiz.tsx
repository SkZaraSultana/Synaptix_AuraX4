import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { getQuiz, submitQuizResult } from '../lib/api'
import { useDomain, domainLabelFromKey } from '../contexts/DomainProvider'
import { getProfile } from '../lib/api'
import { useGamificationStore } from '../store/gamification'

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  answer: number
  explanation: string
  skill?: string
}

type QuizResponse = {
  id: string
  selected: number
  correctIndex: number
  correctLabel: string
  explanation: string
  skill?: string
  isCorrect: boolean
  timeTaken: number
  timedOut?: boolean
}

const MODES = [
  { id: 'concept', label: 'Concept Quiz', description: 'Scenario-driven questions that validate fundamentals.' },
  { id: 'interview', label: 'Interview Quiz', description: 'Rapid prompts to rehearse interview-style answers.' },
  { id: 'rapid', label: 'Rapid Round', description: 'Time-boxed decisions for real-world reflexes.' },
] as const

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', description: 'Start here if you are new to the domain.' },
  { id: 'intermediate', label: 'Intermediate', description: 'Dig deeper into applied techniques.' },
  { id: 'advanced', label: 'Advanced', description: 'Triage production-grade scenarios.' },
] as const

const DEFAULT_TIME_LIMIT = 60

const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

type QuizMeta = {
  timePerQuestion: number
  pointsPerCorrect: number
  totalAvailable: number
}

type QuizSummary = {
  score: number
  awarded_xp: number
  badges: string[]
  strengths: string[]
  weaknesses: string[]
  recommendations: Array<{ skill: string; resources: Array<{ title: string; url: string; source: string }> }>
  suggested_next_steps: Array<{ skill: string; mini_task?: string; duration?: string }>
  total_points: number
  streak_bonus: number
  max_streak: number
  time_spent_seconds: number
  points_per_correct: number
}

const Quiz: React.FC = () => {
  const { domain: domainKey, domainLabel } = useDomain()
  const [activeDomain, setActiveDomain] = useState(domainLabelFromKey(domainKey))
  const [mode, setMode] = useState<typeof MODES[number]['id']>('concept')
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]['id']>('intermediate')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<QuizSummary | null>(null)
  const [isSubmittingResults, setIsSubmittingResults] = useState(false)
  const [quizMeta, setQuizMeta] = useState<QuizMeta | null>(null)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(DEFAULT_TIME_LIMIT)
  const [currentPoints, setCurrentPoints] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [maxStreakLive, setMaxStreakLive] = useState(0)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)
  const countdownRef = useRef<number | null>(null)

  const addXp = useGamificationStore((state) => state.addXp)
  const mergeBadges = useGamificationStore((state) => state.mergeBadges)

  // sync domain with profile if available
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const profile = await getProfile()
        const profileDomain = profile.data?.domain
        if (mounted && profileDomain) {
          setActiveDomain(profileDomain)
          return
        }
      } catch (err) {
        console.warn('Profile domain fetch failed, using context domain.', err)
      }
      if (mounted) {
        setActiveDomain(domainLabel ?? domainLabelFromKey(domainKey))
      }
    })()
    return () => {
      mounted = false
    }
  }, [domainKey, domainLabel])

  const triggerConfetti = useCallback(() => {
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 160,
        spread: 70,
        angle: 75,
        origin: { y: 0.6 },
      })
    })
  }, [])

  const loadQuiz = useCallback(async () => {
    if (!activeDomain) return

    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    setIsLoading(true)
    setError(null)
    setSummary(null)
    setQuestions([])
    setResponses([])
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsAnswerSubmitted(false)
    setCorrectCount(0)
    setCurrentPoints(0)
    setCurrentStreak(0)
    setMaxStreakLive(0)
    setTotalTimeSpent(0)
    setQuizMeta(null)

      try {
      const res = await getQuiz(activeDomain, mode, difficulty)
      const data = res.data
      if (!data?.items || data.items.length === 0) {
        setError('No questions available yet. Try a different mode or difficulty.')
        return
      }
      setQuestions(data.items)
      const meta = data.meta || {}
      const timePerQuestion = meta.time_per_question ?? DEFAULT_TIME_LIMIT
      const pointsPerCorrect = meta.points_per_correct ?? 20
      const totalAvailable = meta.total_available ?? data.items.length
      setQuizMeta({
        timePerQuestion,
        pointsPerCorrect,
        totalAvailable,
      })
      setQuestionTimeLeft(timePerQuestion)
    } catch (err: any) {
      console.error('Failed to load quiz:', err)
      const detail = err?.response?.data?.detail || err?.message || 'Unable to load quiz.'
      setError(detail)
    } finally {
      setIsLoading(false)
    }
  }, [activeDomain, mode, difficulty])

  useEffect(() => {
    if (activeDomain) {
      loadQuiz()
    }
  }, [activeDomain, mode, difficulty, loadQuiz])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length
    ? Math.round(((currentIndex + (isAnswerSubmitted ? 1 : 0)) / questions.length) * 100)
    : 0

  const handleSelectOption = (optionIdx: number) => {
    if (isAnswerSubmitted) return
    setSelectedOption(optionIdx)
  }

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQuestion) {
      toast.error('Select an option first.')
      return
    }
    if (responses.some((resp) => resp.id === currentQuestion.id)) {
      return
    }
    const totalWindow = quizMeta?.timePerQuestion ?? DEFAULT_TIME_LIMIT
    const timeTakenRaw = totalWindow - questionTimeLeft
    const timeTaken = Math.max(1, Math.min(totalWindow, timeTakenRaw))

    const isCorrect = selectedOption === currentQuestion.answer
    setIsAnswerSubmitted(true)
    if (isCorrect) {
      setCorrectCount((count) => count + 1)
      setCurrentPoints((points) => points + (quizMeta?.pointsPerCorrect ?? 20))
      setCurrentStreak((prev) => {
        const next = prev + 1
        setMaxStreakLive((max) => Math.max(max, next))
        return next
      })
    } else {
      setCurrentStreak(0)
    }
    setTotalTimeSpent((prev) => prev + timeTaken)
    setResponses((prev) => [
      ...prev,
      {
        id: currentQuestion.id,
        selected: selectedOption,
        correctIndex: currentQuestion.answer,
        correctLabel: currentQuestion.options[currentQuestion.answer],
        explanation: currentQuestion.explanation,
        skill: currentQuestion.skill,
        isCorrect,
        timeTaken,
        timedOut: false,
      },
    ])
  }

  const handleFinishQuiz = useCallback(async () => {
    if (responses.length !== questions.length) {
      toast.error('Answer every question to finish.')
      return
    }
    const score = Math.round((correctCount / questions.length) * 100)
    setIsSubmittingResults(true)
    try {
      const payload = {
        domain: activeDomain,
        mode,
        difficulty,
        score,
        total_questions: questions.length,
        total_time_taken: Math.round(totalTimeSpent),
        responses: responses.map((r) => ({
          id: r.id,
          selected: r.selected,
          correct: r.isCorrect ? 1 : 0,
          correctLabel: r.correctLabel,
          explanation: r.explanation,
          skill: r.skill,
          time_taken: Math.round(r.timeTaken),
        })),
      }
      const res = await submitQuizResult(payload as any)
      const result = res.data
      setSummary({
        score,
        awarded_xp: result.awarded_xp,
        badges: result.badges || [],
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        recommendations: result.recommendations || [],
        suggested_next_steps: result.suggested_next_steps || [],
        total_points: result.total_points || 0,
        streak_bonus: result.streak_bonus || 0,
        max_streak: result.max_streak || 0,
        time_spent_seconds: result.time_spent_seconds || Math.round(totalTimeSpent),
        points_per_correct: result.points_per_correct || quizMeta?.pointsPerCorrect || 0,
      })
      addXp(result.awarded_xp || 0)
      if (result.badges) {
        mergeBadges(result.badges)
      }
      setCurrentPoints(result.total_points ?? currentPoints)
      setMaxStreakLive((prev) => Math.max(prev, result.max_streak ?? prev))
      setCurrentStreak(0)
      if (score === 100) {
        triggerConfetti()
      }
    } catch (err: any) {
      console.error('Failed to submit quiz results:', err)
      const detail = err?.response?.data?.detail || err?.message || 'Could not save your results.'
      toast.error(detail)
    } finally {
      setIsSubmittingResults(false)
    }
  }, [
    responses,
    questions.length,
    correctCount,
    activeDomain,
    mode,
    difficulty,
    totalTimeSpent,
    addXp,
    mergeBadges,
    triggerConfetti,
    quizMeta?.pointsPerCorrect,
    currentPoints,
  ])

  const handleNextQuestion = useCallback(() => {
    if (!isAnswerSubmitted) {
      toast.error('Submit your answer before continuing.')
            return
          }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (currentIndex === questions.length - 1) {
      handleFinishQuiz()
    } else {
      setCurrentIndex((idx) => idx + 1)
      setSelectedOption(null)
      setIsAnswerSubmitted(false)
      setQuestionTimeLeft(quizMeta?.timePerQuestion ?? DEFAULT_TIME_LIMIT)
    }
  }, [isAnswerSubmitted, currentIndex, questions.length, handleFinishQuiz, quizMeta?.timePerQuestion])

  const handleTimeExpired = useCallback(() => {
    if (isAnswerSubmitted || !currentQuestion) return
    if (responses.some((resp) => resp.id === currentQuestion.id)) return
    window.setTimeout(() => toast.error("Time's up!"), 0)
    const totalWindow = quizMeta?.timePerQuestion ?? DEFAULT_TIME_LIMIT
    setIsAnswerSubmitted(true)
    setSelectedOption(-1)
    setCurrentStreak(0)
    setTotalTimeSpent((prev) => prev + totalWindow)
    setResponses((prev) => [
      ...prev,
      {
        id: currentQuestion.id,
        selected: -1,
        correctIndex: currentQuestion.answer,
        correctLabel: currentQuestion.options[currentQuestion.answer],
        explanation: currentQuestion.explanation,
        skill: currentQuestion.skill,
        isCorrect: false,
        timeTaken: totalWindow,
        timedOut: true,
      },
    ])
    setQuestionTimeLeft(0)
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    window.setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        handleFinishQuiz()
      } else {
        setCurrentIndex((idx) => idx + 1)
        setSelectedOption(null)
        setIsAnswerSubmitted(false)
        setQuestionTimeLeft(quizMeta?.timePerQuestion ?? DEFAULT_TIME_LIMIT)
      }
    }, 1200)
  }, [isAnswerSubmitted, currentQuestion, quizMeta?.timePerQuestion, currentIndex, questions.length, handleFinishQuiz, responses])

  useEffect(() => {
    if (!quizMeta || summary || isLoading || questions.length === 0) {
      return
    }
    if (isAnswerSubmitted) {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      return
    }

    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    setQuestionTimeLeft((prev) => {
      if (prev <= 0 || prev > quizMeta.timePerQuestion) {
        return quizMeta.timePerQuestion
      }
      return prev
    })

    countdownRef.current = window.setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            window.clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          handleTimeExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [quizMeta, summary, isLoading, questions.length, isAnswerSubmitted, handleTimeExpired, currentIndex])

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [])

  const questionFeedback = useMemo(() => {
    if (!isAnswerSubmitted || !currentQuestion) return null
    const response =
      responses.find((resp) => resp.id === currentQuestion.id) ?? responses[responses.length - 1]
    if (!response) return null
    if (response.timedOut) {
      return {
        isCorrect: false,
        timedOut: true as const,
        message: "Time's up! Let's review before moving on.",
        explanation: response.explanation,
        timeTaken: response.timeTaken,
      }
    }
    return {
      isCorrect: response.isCorrect,
      timedOut: false as const,
      message: response.isCorrect ? 'Nice work! That was spot on.' : 'Not quite. Review the explanation below.',
      explanation: response.explanation,
      timeTaken: response.timeTaken,
    }
  }, [isAnswerSubmitted, currentQuestion, responses])

  const optionClass = (optionIdx: number) => {
    if (!currentQuestion) return 'border-slate-800 bg-slate-900 hover:border-brand-purple/40'
    if (!isAnswerSubmitted) {
      return selectedOption === optionIdx
        ? 'border-brand-purple bg-brand-purple/15 text-brand-purple'
        : 'border-slate-800 bg-slate-900 hover:border-brand-purple/40'
    }
    if (optionIdx === currentQuestion.answer) {
      return 'border-green-500 bg-green-500/10 text-green-300'
    }
    if (selectedOption === optionIdx && optionIdx !== currentQuestion.answer) {
      return 'border-red-500 bg-red-500/10 text-red-300'
    }
    return 'border-slate-800 bg-slate-900'
  }

  const handleRetake = () => {
    loadQuiz()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl sm:text-5xl">
            {activeDomain} Smart Quiz
          </motion.h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl mx-auto">
            Choose your mode, set the difficulty, and sharpen your {activeDomain} instincts. Instant feedback and personalized next steps close the loop.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-900/70 border-slate-800">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-blue">Mode</p>
              <h2 className="text-lg font-semibold text-slate-100">How would you like to practice?</h2>
            </div>
            <div className="space-y-3">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    mode === item.id
                      ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                      : 'border-slate-800 bg-slate-900 hover:border-brand-purple/40'
                  }`}
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-blue">Difficulty</p>
              <h2 className="text-lg font-semibold text-slate-100">Tune the challenge level</h2>
            </div>
            <div className="space-y-3">
              {DIFFICULTIES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDifficulty(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    difficulty === item.id
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                      : 'border-slate-800 bg-slate-900 hover:border-brand-blue/40'
                  }`}
                >
                  <div className="font-semibold capitalize">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Card className="bg-slate-900/80 border-slate-800 p-6 space-y-6">
          {!summary && quizMeta && questions.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs uppercase tracking-[0.3em] text-slate-400">
              <div className="flex flex-col text-center gap-1">
                <span>Timer</span>
                <span className={`text-2xl font-semibold tracking-tight ${questionTimeLeft <= 10 ? 'text-orange-400' : 'text-slate-100'}`}>
                  {formatTime(questionTimeLeft)}
                </span>
              </div>
              <div className="flex flex-col text-center gap-1">
                <span>Points</span>
                <span className="text-2xl font-semibold text-brand-purple tracking-tight">
                  {currentPoints}
                </span>
                <span className="text-[10px] tracking-[0.25em] text-slate-500">+{quizMeta.pointsPerCorrect} / correct</span>
              </div>
              <div className="flex flex-col text-center gap-1">
                <span>Streak</span>
                <span className="text-2xl font-semibold text-brand-blue tracking-tight">
                  {currentStreak}
                </span>
                <span className="text-[10px] tracking-[0.25em] text-slate-500">Best {maxStreakLive}</span>
              </div>
              <div className="flex flex-col text-center gap-1">
                <span>Progress</span>
                <span className="text-2xl font-semibold text-slate-100 tracking-tight">
                  {currentIndex + 1}/{questions.length || quizMeta.totalAvailable}
                </span>
                <span className="text-[10px] tracking-[0.25em] text-slate-500">Questions</span>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <LoadingSpinner size={42} className="text-brand-blue" />
              <p className="text-sm text-slate-400">Loading questions tailored to your domain...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-red-300">{error}</p>
              <Button onClick={loadQuiz} variant="ghost" className="border-slate-700">
                Try again
              </Button>
            </div>
          ) : summary ? (
            <AnimatePresence mode="wait">
        <motion.div
                key="summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-blue">Quiz Complete</p>
                  <h2 className="text-4xl font-semibold">{summary.score}% Score</h2>
                  <p className="text-sm text-slate-400">
                    You earned <span className="text-brand-purple font-medium">{summary.awarded_xp} XP</span> and unlocked{' '}
                    {summary.badges.length} badge{summary.badges.length === 1 ? '' : 's'}.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {summary.badges.map((badge) => (
                      <span key={badge} className="px-3 py-1 rounded-full bg-brand-purple/15 text-brand-purple text-xs font-medium uppercase tracking-wide">
                        {badge}
                      </span>
                    ))}
              </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-slate-900/70 border-slate-800 text-center py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Points</p>
                    <p className="text-3xl font-semibold text-brand-purple mt-2">{summary.total_points}</p>
                    <p className="text-[11px] tracking-[0.2em] text-slate-500 mt-1">+{summary.points_per_correct} each</p>
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-800 text-center py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Streak Bonus</p>
                    <p className="text-3xl font-semibold text-brand-blue mt-2">{summary.streak_bonus}</p>
                    <p className="text-[11px] tracking-[0.2em] text-slate-500 mt-1">Max streak {summary.max_streak}</p>
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-800 text-center py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Time Spent</p>
                    <p className="text-3xl font-semibold text-slate-100 mt-2">
                      {formatTime(summary.time_spent_seconds)}
                    </p>
                    <p className="text-[11px] tracking-[0.2em] text-slate-500 mt-1">Across {questions.length} questions</p>
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-800 text-center py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Accuracy</p>
                    <p className="text-3xl font-semibold text-green-300 mt-2">
                      {Math.round((summary.score / 100) * questions.length)}/{questions.length}
                    </p>
                    <p className="text-[11px] tracking-[0.2em] text-slate-500 mt-1">Correct answers</p>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-slate-900/70 border-slate-800">
                    <p className="text-sm font-semibold text-green-300 mb-2">Strengths</p>
                    {summary.strengths.length === 0 ? (
                      <p className="text-xs text-slate-400">Keep practicing to surface clear strengths.</p>
                    ) : (
                      <ul className="space-y-1 text-sm text-slate-200">
                        {summary.strengths.map((skill) => (
                          <li key={skill}>• {skill}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-800">
                    <p className="text-sm font-semibold text-orange-300 mb-2">Weak signals</p>
                    {summary.weaknesses.length === 0 ? (
                      <p className="text-xs text-slate-400">No weak areas detected—phenomenal work!</p>
                    ) : (
                      <ul className="space-y-1 text-sm text-slate-200">
                        {summary.weaknesses.map((skill) => (
                          <li key={skill}>• {skill}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
            </div>

                {summary.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recommended learning modules</h3>
                    <div className="space-y-3">
                      {summary.recommendations.map((rec) => (
                        <Card key={rec.skill} className="bg-slate-900/60 border-slate-800">
                          <p className="text-sm font-semibold text-brand-purple mb-1">{rec.skill}</p>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {rec.resources.map((resource) => (
                              <li key={resource.url} className="flex items-center justify-between gap-3">
                                <span>{resource.title}</span>
                                <Button
                                  variant="ghost"
                                    className="text-xs border-slate-700"
                                  onClick={() => window.open(resource.url, '_blank', 'noopener')}
                                >
                                  Open
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {summary.suggested_next_steps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Suggested next steps</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {summary.suggested_next_steps.map((step, idx) => (
                        <Card key={`${step.skill}-${idx}`} className="bg-slate-900/60 border-slate-800">
                          <p className="text-sm font-semibold text-brand-blue">{step.skill}</p>
                          {step.mini_task && <p className="text-xs text-slate-400 mt-2">{step.mini_task}</p>}
                          {step.duration && <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider">{step.duration}</p>}
                        </Card>
                      ))}
                    </div>
              </div>
            )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleRetake} className="flex-1">
                    Take another quiz
                  </Button>
                  <Button variant="ghost" className="flex-1 border-slate-700" onClick={loadQuiz}>
                    Refresh questions
                </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No questions available yet for this combination. Try switching modes or difficulty.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-blue">
                    {mode === 'concept' ? 'Concept Quiz' : mode === 'interview' ? 'Interview Drill' : 'Rapid Round'}
                  </p>
                  <h2 className="text-2xl font-semibold">
                    Question {currentIndex + 1} <span className="text-slate-500 text-base">/ {questions.length}</span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase">Progress</span>
                  <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-brand-blue to-brand-purple" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {currentQuestion && (
                    <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">{currentQuestion.skill}</p>
                    <h3 className="text-xl font-semibold text-slate-100">{currentQuestion.question}</h3>
                      </div>

                  <div className="grid gap-3">
                    {currentQuestion.options.map((option, idx) => (
                          <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`text-left px-4 py-3 rounded-lg border transition-all ${
                          isAnswerSubmitted ? 'cursor-default' : 'hover:-translate-y-[1px] hover:border-brand-purple/60'
                        } ${optionClass(idx)}`}
                          >
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-semibold text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                          <span className="text-sm">{option}</span>
                            </div>
                          </button>
                  ))}
                </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {!isAnswerSubmitted ? (
                      <Button onClick={handleSubmitAnswer} className="flex-1" disabled={selectedOption === null}>
                        Lock answer
                      </Button>
                    ) : (
                      <Button onClick={handleNextQuestion} className="flex-1" disabled={isSubmittingResults}>
                        {currentIndex === questions.length - 1 ? 'Finish quiz' : 'Next question'}
                      </Button>
                  )}
                </div>

                  <AnimatePresence>
                    {questionFeedback && (
                  <motion.div
                        key="feedback"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`rounded-lg border px-4 py-3 text-sm ${
                          questionFeedback.isCorrect
                            ? 'border-green-500 bg-green-500/10 text-green-200'
                            : 'border-orange-500 bg-orange-500/10 text-orange-200'
                        }`}
                  >
                        <div className="font-medium mb-1">{questionFeedback.message}</div>
                        <div className="text-xs text-slate-200/70 leading-relaxed">{questionFeedback.explanation}</div>
                        {typeof questionFeedback.timeTaken === 'number' && (
                          <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
                            Time used: {formatTime(questionFeedback.timeTaken)}
                      </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </motion.div>
                )}
            </div>
            )}
          </Card>
      </div>
    </div>
  )
}

export default Quiz
