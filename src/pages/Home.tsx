import React, { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { getProfile, getRecommendations, getSkillRecommendations, trackProgress, getUserProgress } from '../lib/api'
import authStore from '../store/auth'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Domain-based theme configuration
const DOMAIN_THEMES: Record<string, {
  gradient: string
  heroText: string
  accent: string
  bg: string
  glow: string
}> = {
  'Cybersecurity': {
    gradient: 'from-[#0a0f16] via-[#1a2332] to-[#0a0f16]',
    heroText: 'Secure the Future. Train to Protect.',
    accent: '#00eaff',
    bg: 'bg-[#0a0f16]',
    glow: 'shadow-[0_0_30px_rgba(0,234,255,0.3)]'
  },
  'AI/ML': {
    gradient: 'from-violet-600 via-purple-600 to-blue-500',
    heroText: 'Build Intelligence. Shape Tomorrow.',
    accent: '#A259FF',
    bg: 'bg-gradient-to-br from-violet-600 to-blue-500',
    glow: 'shadow-[0_0_30px_rgba(162,89,255,0.4)]'
  },
  'Web Development': {
    gradient: 'from-orange-500 via-pink-500 to-purple-600',
    heroText: 'Create Experiences. Code the Web.',
    accent: '#FF7A00',
    bg: 'bg-gradient-to-br from-orange-500 to-purple-600',
    glow: 'shadow-[0_0_30px_rgba(255,122,0,0.4)]'
  },
  'Data Science': {
    gradient: 'from-teal-500 via-cyan-500 to-green-500',
    heroText: 'Turn Data Into Decisions.',
    accent: '#00D2D4',
    bg: 'bg-gradient-to-br from-teal-500 to-green-500',
    glow: 'shadow-[0_0_30px_rgba(0,210,212,0.4)]'
  },
  'Cloud Computing': {
    gradient: 'from-blue-300 via-sky-200 to-white',
    heroText: 'Deploy Globally. Scale Seamlessly.',
    accent: '#A1C4FD',
    bg: 'bg-gradient-to-br from-blue-300 to-white',
    glow: 'shadow-[0_0_30px_rgba(161,196,253,0.4)]'
  },
  'IoT': {
    gradient: 'from-[#161616] via-[#2a2a2a] to-[#161616]',
    heroText: 'Connect Devices. Automate the Real World.',
    accent: '#40FF85',
    bg: 'bg-[#161616]',
    glow: 'shadow-[0_0_30px_rgba(64,255,133,0.4)]'
  }
}

const DEFAULT_THEME = DOMAIN_THEMES['AI/ML']

type RecommendationItem = {
  title: string
  url: string
  source: string
}

type ProgressData = {
  history?: Array<{ day: string; score: number }>
  streak?: number
  quizScore?: number
  codingScore?: number
}

export default function Home() {
  const navigate = useNavigate()
  const token = authStore(s => s.token)
  const user = authStore(s => s.user)
  const [domain, setDomain] = useState<string>('AI/ML')
  const [userName, setUserName] = useState<string>('User')
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [progress, setProgress] = useState<ProgressData>({})
  const [loading, setLoading] = useState(true)
  
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, -50])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  const theme = DOMAIN_THEMES[domain] || DEFAULT_THEME

  useEffect(() => {
    if (!token) {
      // Show landing page if not logged in
      return
    }

    loadUserData()
  }, [token])

  async function loadUserData() {
    setLoading(true)
    try {
      // Fetch user profile
      const profileRes = await getProfile()
      if (profileRes.data) {
        setUserName(profileRes.data.name || 'User')
        setDomain(profileRes.data.domain || 'AI/ML')
      }

      // Fetch domain-based recommendations
      const domainValue = profileRes.data?.domain || 'AI/ML'
      try {
        const recRes = await getRecommendations(domainValue)
        if (recRes.data?.items) {
          setRecommendations(recRes.data.items)
        }
      } catch (e) {
        console.warn('Failed to load recommendations:', e)
      }

      // Fetch skill recommendations
      try {
        const skillsRes = await getSkillRecommendations(domainValue)
        if (skillsRes.data?.recommendations) {
          const allSkills: string[] = []
          skillsRes.data.recommendations.forEach((rec: any) => {
            if (rec.skill) allSkills.push(rec.skill)
          })
          setSkills(allSkills.slice(0, 12))
        }
      } catch (e) {
        console.warn('Failed to load skills:', e)
        // Fallback skills based on domain
        setSkills(getDefaultSkills(domainValue))
      }

      // Fetch progress
      try {
        const progressRes = await getUserProgress()
        if (progressRes.data?.data) {
          const progressData = progressRes.data.data
          // Transform progress data to match our format
          const history = progressData.history || [
            { day: 'Mon', score: 65 },
            { day: 'Tue', score: 68 },
            { day: 'Wed', score: 72 },
            { day: 'Thu', score: 75 },
            { day: 'Fri', score: 78 },
            { day: 'Sat', score: 80 },
            { day: 'Sun', score: 82 }
          ]
          setProgress({
            history,
            streak: progressData.streak || 0,
            quizScore: progressData.quizScore || 0,
            codingScore: progressData.codingScore || 0
          })
        } else {
          // Default progress if no data
          setProgress({
            history: [
              { day: 'Mon', score: 50 },
              { day: 'Tue', score: 55 },
              { day: 'Wed', score: 60 },
              { day: 'Thu', score: 65 },
              { day: 'Fri', score: 70 },
              { day: 'Sat', score: 75 },
              { day: 'Sun', score: 80 }
            ],
            streak: 0,
            quizScore: 0,
            codingScore: 0
          })
        }
      } catch (e) {
        console.warn('Failed to load progress:', e)
        // Set default progress on error
        setProgress({
          history: [
            { day: 'Mon', score: 50 },
            { day: 'Tue', score: 55 },
            { day: 'Wed', score: 60 },
            { day: 'Thu', score: 65 },
            { day: 'Fri', score: 70 },
            { day: 'Sat', score: 75 },
            { day: 'Sun', score: 80 }
          ],
          streak: 0,
          quizScore: 0,
          codingScore: 0
        })
      }
    } catch (e: any) {
      console.error('Failed to load user data:', e)
      toast.error('Failed to load personalized content')
    } finally {
      setLoading(false)
    }
  }

  function getDefaultSkills(domain: string): string[] {
    const skillMap: Record<string, string[]> = {
      'Cybersecurity': ['Penetration Testing', 'SIEM', 'Incident Response', 'Threat Analysis', 'Cloud Security', 'Firewall'],
      'AI/ML': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'],
      'Web Development': ['React', 'Node.js', 'TypeScript', 'Next.js', 'GraphQL', 'REST API'],
      'Data Science': ['Python', 'Pandas', 'SQL', 'Machine Learning', 'Data Visualization', 'Statistics'],
      'Cloud Computing': ['AWS', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
      'IoT': ['Embedded Systems', 'MQTT', 'Arduino', 'Raspberry Pi', 'Sensor Networks', 'Edge Computing']
    }
    return skillMap[domain] || skillMap['AI/ML']
  }

  async function handleCourseClick(course: RecommendationItem) {
    try {
      await trackProgress('course_clicked', {
        course: course.title,
        source: course.source,
        domain
      })
      window.open(course.url, '_blank')
      toast.success(`Opening ${course.title}`)
    } catch (e) {
      console.error('Failed to track progress:', e)
      window.open(course.url, '_blank')
    }
  }

  // Landing page for non-authenticated users
  if (!token) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center p-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-7xl mb-6">📊</div>
            <h1 className="font-display text-5xl md:text-6xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
              RankRight
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Your Intelligent Career Companion
              <br />
              <span className="text-base">AI-powered skills, resume, and personalized learning paths</span>
            </p>
            <div className="flex gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => navigate('/login')}>Get Started</Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" onClick={() => navigate('/register')}>
                  Create Account
                </Button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {[
              { icon: '🎯', title: 'AI Resume Builder', desc: 'Smart resume analysis and generation' },
              { icon: '📊', title: 'Skill Tracking', desc: 'Real-time skill gap detection' },
              { icon: '🚀', title: 'Career Path', desc: 'Personalized learning recommendations' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                className="glass rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-2">{f.title}</div>
                <div className="text-sm text-slate-600">{f.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  // Personalized Home for authenticated users
  return (
    <div className={`min-h-screen ${theme.bg} text-white overflow-hidden`}>
      {/* Hero Section */}
      <motion.section
        style={{ y, opacity }}
        className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden"
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-90`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Welcome Back,{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                {userName}
              </span>
            </motion.h1>
            
            <motion.p
              className="text-2xl md:text-4xl mb-4 font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {theme.heroText}
            </motion.p>
            
            <motion.div
              className="inline-block px-6 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <span className="text-lg">Your Learning Track: <strong>{domain}</strong></span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Button
                onClick={() => navigate('/learning')}
                className={`${theme.glow} px-8 py-4 text-lg bg-white text-gray-900 hover:bg-gray-100`}
              >
                Start Learning →
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2" />
          </div>
        </motion.div>
      </motion.section>

      {/* Domain Key Skills Highlight */}
      <section className="relative py-20 px-6 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Key Skills for {domain}
          </motion.h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            {skills.map((skill, index) => (
              <motion.div
                key={skill}
                className={`px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 ${theme.glow} cursor-pointer hover:scale-110 transition-transform`}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="font-medium">{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Learning Path */}
      <section className="relative py-20 px-6 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Your Learning Path
          </motion.h2>

          <div className="overflow-x-auto pb-6">
            <div className="flex gap-6 min-w-max">
              {(recommendations.length > 0 ? recommendations : getDefaultCourses(domain)).map((course, index) => (
                <motion.div
                  key={index}
                  className="min-w-[320px] bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={() => handleCourseClick(course)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                      {course.source === 'YouTube' ? '📺' : course.source === 'Coursera' ? '🎓' : '📚'}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{course.title}</div>
                      <div className="text-sm text-white/70">{course.source}</div>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCourseClick(course)
                    }}
                  >
                    Start Learning →
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Panel */}
      <section className="relative py-20 px-6 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Quick Actions
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Resume Analyzer', icon: '📄', path: '/resume', desc: 'Analyze & optimize your resume' },
              { title: 'Coding Practice', icon: '💻', path: '/coding', desc: 'Practice coding challenges' },
              { title: 'Projects', icon: '🚀', path: '/projects', desc: 'Get project suggestions' },
              { title: 'Certifications', icon: '🎖️', path: '/learning', desc: 'Certification roadmap' },
            ].map((action, index) => (
              <motion.div
                key={action.title}
                className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 ${theme.glow} cursor-pointer`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -5, backgroundColor: 'rgba(255,255,255,0.15)' }}
                onClick={() => navigate(action.path)}
              >
                <div className="text-4xl mb-4">{action.icon}</div>
                <div className="font-bold text-xl mb-2">{action.title}</div>
                <div className="text-sm text-white/70">{action.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Progress Graph */}
      <section className="relative py-20 px-6 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Your Progress
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <div className="font-bold text-xl mb-4">Skill Level Growth</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progress.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={theme.accent}
                      strokeWidth={3}
                      dot={{ fill: theme.accent, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <div className="font-bold text-xl mb-4">Daily Streak</div>
                <div className="text-5xl font-bold mb-2" style={{ color: theme.accent }}>
                  {progress.streak || 0} 🔥
                </div>
                <div className="text-sm text-white/70">Keep it up! You're on a roll.</div>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <div className="font-bold text-xl mb-4">Scores</div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Quiz Score</span>
                      <span className="font-bold" style={{ color: theme.accent }}>
                        {progress.quizScore || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress.quizScore || 0}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Coding Score</span>
                      <span className="font-bold" style={{ color: theme.accent }}>
                        {progress.codingScore || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress.codingScore || 0}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.7 }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function getDefaultCourses(domain: string): RecommendationItem[] {
  const courseMap: Record<string, RecommendationItem[]> = {
    'Cybersecurity': [
      { title: 'Cybersecurity Fundamentals', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Ethical Hacking Course', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'Penetration Testing', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
    'AI/ML': [
      { title: 'Machine Learning Crash Course', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Deep Learning Specialization', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'TensorFlow for Beginners', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
    'Web Development': [
      { title: 'React Masterclass', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Full Stack Development', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'Next.js Complete Guide', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
    'Data Science': [
      { title: 'Data Science Specialization', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Python for Data Science', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'SQL Mastery', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
    'Cloud Computing': [
      { title: 'AWS Certified Solutions Architect', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Kubernetes Tutorial', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'Docker Complete Course', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
    'IoT': [
      { title: 'IoT Fundamentals', url: 'https://www.coursera.org/', source: 'Coursera' },
      { title: 'Arduino Programming', url: 'https://www.youtube.com/', source: 'YouTube' },
      { title: 'Embedded Systems', url: 'https://www.udemy.com/', source: 'Udemy' },
    ],
  }
  return courseMap[domain] || courseMap['AI/ML']
}
