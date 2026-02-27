import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { generateResumeApi, uploadResume, analyzeResume } from '../lib/api'
import AnalysisResults from '../components/resume/AnalysisResults'
import AiResumeGenerator from '../components/resume/AiResumeGenerator'
import { useLearningPlanStore } from '../store/learningPlan'
import { useDomain, domainKeyFromLabel } from '../contexts/DomainProvider'

type ResumeData = {
  personal: {
    name: string
    email: string
    phone: string
    linkedin: string
    github: string
    location: string
  }
  education: Array<{
    institution: string
    degree: string
    year: string
    gpa: string
  }>
  experience: Array<{
    title: string
    company: string
    duration: string
    responsibilities: string[]
  }>
  projects: Array<{
    title: string
    description: string
    tools: string
    role: string
  }>
  skills: {
    technical: string[]
    soft: string[]
    tools: string[]
    languages: string[]
  }
  achievements: string[]
  certifications: string[]
  domain: string
}

const DOMAINS = ['AI/ML', 'Cybersecurity', 'Data Science', 'Web Development', 'Cloud Computing', 'IoT', 'Robotics']

export default function ResumeBuilder() {
  const [mode, setMode] = useState<'select' | 'create' | 'upload'>('select')
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze')
  const navigate = useNavigate()
  const [hasUploaded, setHasUploaded] = useState(false)
  const setLearningPlanFromAnalysis = useLearningPlanStore(state => state.setFromAnalysis)
  const clearLearningPlan = useLearningPlanStore(state => state.clear)
  const { setDomain } = useDomain()
  useEffect(() => {
    setHasUploaded(false)
    setAnalysisData(null)
    setShowAnalysis(false)
    setGeneratedResume('')
    setAtsScore(null)
    clearLearningPlan()
  }, [])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [resumeData, setResumeData] = useState<ResumeData>({
    personal: { name: '', email: '', phone: '', linkedin: '', github: '', location: '' },
    education: [{ institution: '', degree: '', year: '', gpa: '' }],
    experience: [{ title: '', company: '', duration: '', responsibilities: [''] }],
    projects: [{ title: '', description: '', tools: '', role: '' }],
    skills: { technical: [], soft: [], tools: [], languages: [] },
    achievements: [''],
    certifications: [''],
    domain: 'AI/ML',
  })
  const [generatedResume, setGeneratedResume] = useState<string>('')
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)

  function addEducation() {
    setResumeData(d => ({ ...d, education: [...d.education, { institution: '', degree: '', year: '', gpa: '' }] }))
  }

  function addExperience() {
    setResumeData(d => ({ ...d, experience: [...d.experience, { title: '', company: '', duration: '', responsibilities: [''] }] }))
  }

  function addProject() {
    setResumeData(d => ({ ...d, projects: [...d.projects, { title: '', description: '', tools: '', role: '' }] }))
  }

  function addSkill(type: keyof typeof resumeData.skills) {
    const skill = prompt(`Enter ${type} skill:`)
    if (skill) {
      setResumeData(d => ({ ...d, skills: { ...d.skills, [type]: [...d.skills[type], skill] } }))
    }
  }

  async function handleGenerate() {
    setLoading(true)
    try {
      const achievements = resumeData.achievements.filter(a => a.trim())
      const allSkills = [
        ...resumeData.skills.technical,
        ...resumeData.skills.soft,
        ...resumeData.skills.tools,
        ...resumeData.skills.languages,
      ]
      
      const res = await generateResumeApi({
        name: resumeData.personal.name,
        domain: resumeData.domain,
        skills: allSkills,
        achievements,
        personal: resumeData.personal,
        education: resumeData.education,
        experience: resumeData.experience,
        projects: resumeData.projects,
      })
      
      setGeneratedResume(res.data.content)
      setAtsScore(res.data.ats_score || null)
      toast.success('Resume generated successfully!')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate resume')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    try {
      clearLearningPlan()
      setAnalysisData(null)
      setShowAnalysis(false)
      setGeneratedResume('')
      setAtsScore(null)

      const res = await uploadResume(f)
      setHasUploaded(true)
      setAtsScore(res.data.ats_score)
      toast.success('Resume uploaded! Analyzing with AI...')
      
      // Trigger comprehensive AI analysis
      setTimeout(async () => {
        await runFullAnalysis()
      }, 1000)
      
      if (res.data.skill_gaps) {
        setResumeData(d => ({
          ...d,
          skills: { ...d.skills, technical: [...d.skills.technical, ...res.data.skill_gaps.slice(0, 3)] },
        }))
      }
    } catch (e: any) {
      setHasUploaded(false)
      toast.error('Failed to upload resume')
    } finally {
      setLoading(false)
    }
  }

  async function runFullAnalysis() {
    if (!hasUploaded) {
      toast.error('Upload a resume before running the AI analysis.')
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeResume()
      const analysis = res.data
      setAnalysisData(analysis)
      setShowAnalysis(true)
      toast.success('AI analysis complete! Taking you to your learning plan...')

      if (analysis) {
        const recommendedResources = analysis.recommended_resources || []

        const toPlanResource = (resItem?: any | null): PlanResource | null => {
          if (!resItem) return null
          return {
            title: resItem.title,
            url: resItem.url,
            source: resItem.source,
            estimated_time: resItem.estimated_time,
            level: resItem.level,
            reason: resItem.reason,
          }
        }

        const timeline: PlanStep[] = recommendedResources.map((item: any, idx: number) => {
          const resources: any[] = item.resources || []
          const videoRes = resources.find((r) => (r.source || '').toLowerCase().includes('youtube')) || resources[0]
          const courseRes = resources.find((r) => /(coursera|udemy|playlist)/i.test(r.source || '')) || resources[1]
          return {
            order: idx + 1,
            skill: item.skill,
            focus: `Strengthen ${item.skill}`,
            miniTask: `Complete the recommended tasks and capture measurable results for ${item.skill}.`,
            duration: courseRes?.estimated_time || videoRes?.estimated_time,
            video: toPlanResource(videoRes),
            course: toPlanResource(courseRes),
            milestone: `Publish a portfolio artifact demonstrating ${item.skill}`,
          }
        })

        const projects: ProjectIdea[] = (analysis.missing_skills || []).map((skill: string, idx: number) => ({
          title: `${skill} Portfolio Project`,
          description: `Build a project that showcases ${skill}. Document the impact so it can be added to your resume.`,
          difficulty: idx < 2 ? 'Intermediate' : 'Advanced',
          duration: timeline[idx]?.duration || '1-2 weeks',
        }))

        setLearningPlanFromAnalysis(
          analysis.domain,
          recommendedResources,
          {
            missingSkills: analysis.missing_skills || [],
            atsScore: analysis.ats_score,
            timeline,
            projects,
            resumeKeywords: analysis.trending_skills?.resume_keywords || analysis.missing_keywords || [],
            trendingHighDemand: analysis.trending_skills?.high_demand || [],
            trendingEmerging: analysis.trending_skills?.emerging || [],
            certifications: analysis.suggested_certifications || [],
          }
        )
        if (analysis.domain) {
          setDomain(domainKeyFromLabel(analysis.domain))
        }
      }
    } catch (e: any) {
      console.error('Analysis error:', e)
      toast.error('Failed to analyze resume')
    } finally {
      setAnalyzing(false)
    }
  }

  async function downloadPDF() {
    const element = document.getElementById('resume-preview')
    if (!element) return
    
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const opt = {
        margin: 1,
        filename: `${resumeData.personal.name || 'resume'}-resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }
      await html2pdf().set(opt).from(element).save()
      toast.success('PDF downloaded!')
    } catch (error) {
      toast.error('Failed to download PDF. Please try again.')
    }
  }

  const steps = ['Personal', 'Education', 'Experience', 'Projects', 'Skills', 'Achievements', 'Domain']

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-4xl mb-1">Resume Intelligence</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Upload to analyze gaps or let AI craft a brand new resume instantly.
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-white/70 dark:bg-slate-900/50 shadow-sm p-1">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'analyze'
                  ? 'bg-brand-blue text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('analyze')}
            >
              Analyze Resume
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'generate'
                  ? 'bg-brand-purple text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('generate')}
            >
              Generate New Resume
            </button>
          </div>
        </div>

        {activeTab === 'analyze' && mode === 'select' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[70vh]"
          >
            <div className="text-center space-y-6">
              <h1 className="font-display text-4xl mb-4">AI Resume Builder</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Create an ATS-optimized, professional resume powered by AI
              </p>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                <motion.button
                  onClick={() => setMode('create')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass rounded-xl p-8 text-left space-y-3"
                >
                  <div className="text-3xl mb-2">✨</div>
                  <div className="font-semibold text-lg">Create from Scratch</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Fill out a guided form and let AI generate your perfect resume
                  </div>
                </motion.button>
                <motion.button
                  onClick={() => setMode('upload')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass rounded-xl p-8 text-left space-y-3"
                >
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-semibold text-lg">Upload & Enhance</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Upload your existing resume and AI will enhance it
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analyze' && mode === 'upload' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto mt-12"
          >
            <Card>
              <h2 className="font-display text-2xl mb-4">Upload Your Resume</h2>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleUpload}
                disabled={loading || analyzing}
                className="w-full p-4 border rounded-lg mb-4 disabled:opacity-50"
              />
              
              {analyzing && (
                <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                    />
                    <span className="text-sm text-blue-900 dark:text-blue-200">
                      Running comprehensive AI analysis...
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setMode('select')} variant="ghost" className="mt-4">
                  Back
                </Button>
                <Button onClick={() => navigate('/learning')} variant="ghost" className="mt-4 border border-brand-blue text-brand-blue hover:bg-brand-blue/10">
                  Start Learning
                </Button>
                <Button
                  onClick={runFullAnalysis}
                  disabled={analyzing || !hasUploaded}
                  className="mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {analyzing ? 'Analyzing...' : 'Run Full AI Analysis'}
                  </Button>
              </div>
              {!hasUploaded && (
                <p className="text-xs text-slate-500 mt-3">
                  Upload a resume to enable full AI analysis.
                </p>
              )}
            </Card>

            {/* Comprehensive Analysis Results */}
            {showAnalysis && analysisData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                    <h2 className="font-display text-2xl">AI-Powered Resume Analysis</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Review the recommendations below. When you’re ready, click <span className="font-semibold">Start Learning</span> to open a curated plan aligned with your missing skills.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)}>
                      Close
                    </Button>
                        <Button
                          onClick={() => navigate('/learning', { state: { focus: 'skill-gap' } })}
                          className="bg-brand-blue text-white hover:opacity-90"
                        >
                          Start Learning with These Skills
                        </Button>
                      </div>
                    </div>
                    <AnalysisResults data={analysisData} />
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'analyze' && mode === 'create' && (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="glass rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Step {step} of {steps.length}</span>
                <span className="text-sm text-slate-600">{Math.round((step / steps.length) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / steps.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-purple"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Form Sidebar */}
              <div className="md:col-span-1 space-y-4">
                <Card>
                  <div className="font-medium mb-3">Quick Sections</div>
                  <nav className="space-y-2">
                    {steps.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => setStep(i + 1)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          step === i + 1
                            ? 'bg-brand-blue text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {i + 1}. {s}
                      </button>
                    ))}
                  </nav>
                </Card>
              </div>

              {/* Main Form - Continuing with steps 1-7 from previous full file */}
              <div className="md:col-span-2">
                <AnimatePresence mode="wait">
                  {/* Step 1: Personal Info */}
                  {step === 1 && (
                    <motion.div
                      key="personal"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                    >
                      <Card>
                        <h3 className="font-display text-xl mb-4">Personal Information</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Full Name *</label>
                            <input
                              value={resumeData.personal.name}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, name: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="John Doe"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Email *</label>
                            <input
                              type="email"
                              value={resumeData.personal.email}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, email: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="john@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Phone</label>
                            <input
                              value={resumeData.personal.phone}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, phone: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="+1 234 567 8900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Location</label>
                            <input
                              value={resumeData.personal.location}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, location: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="City, Country"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">LinkedIn</label>
                            <input
                              value={resumeData.personal.linkedin}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, linkedin: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="linkedin.com/in/username"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">GitHub</label>
                            <input
                              value={resumeData.personal.github}
                              onChange={e => setResumeData(d => ({ ...d, personal: { ...d.personal, github: e.target.value } }))}
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                              placeholder="github.com/username"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                          <Button onClick={() => setStep(2)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Step 2: Education */}
                  {step === 2 && (
                    <motion.div
                      key="education"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                    >
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-display text-xl">Education</h3>
                          <Button variant="ghost" onClick={addEducation} className="text-sm">
                            + Add Education
                          </Button>
                        </div>
                        {resumeData.education.map((edu, idx) => (
                          <div key={idx} className="space-y-4 mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Institution *</label>
                                <input
                                  value={edu.institution}
                                  onChange={e => {
                                    const newEdu = [...resumeData.education]
                                    newEdu[idx].institution = e.target.value
                                    setResumeData(d => ({ ...d, education: newEdu }))
                                  }}
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Degree / Branch *</label>
                                <input
                                  value={edu.degree}
                                  onChange={e => {
                                    const newEdu = [...resumeData.education]
                                    newEdu[idx].degree = e.target.value
                                    setResumeData(d => ({ ...d, education: newEdu }))
                                  }}
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Year of Graduation *</label>
                                <input
                                  value={edu.year}
                                  onChange={e => {
                                    const newEdu = [...resumeData.education]
                                    newEdu[idx].year = e.target.value
                                    setResumeData(d => ({ ...d, education: newEdu }))
                                  }}
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                  placeholder="2025"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">CGPA / Percentage</label>
                                <input
                                  value={edu.gpa}
                                  onChange={e => {
                                    const newEdu = [...resumeData.education]
                                    newEdu[idx].gpa = e.target.value
                                    setResumeData(d => ({ ...d, education: newEdu }))
                                  }}
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                  placeholder="9.5 / 95%"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                          <Button onClick={() => setStep(3)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Steps 3-7 continue similarly with Experience, Projects, Skills, Achievements, Domain */}
                  {/* For brevity, I'll include key sections - Experience, Skills, Domain and Generate */}
                  
                  {step === 3 && (
                    <motion.div key="experience" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-display text-xl">Experience</h3>
                          <Button variant="ghost" onClick={addExperience} className="text-sm">+ Add Experience</Button>
                        </div>
                        {resumeData.experience.map((exp, idx) => (
                          <div key={idx} className="space-y-4 mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="grid md:grid-cols-3 gap-4">
                              <input value={exp.title} onChange={e => {
                                const newExp = [...resumeData.experience]
                                newExp[idx].title = e.target.value
                                setResumeData(d => ({ ...d, experience: newExp }))
                              }} placeholder="Job Title *" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                              <input value={exp.company} onChange={e => {
                                const newExp = [...resumeData.experience]
                                newExp[idx].company = e.target.value
                                setResumeData(d => ({ ...d, experience: newExp }))
                              }} placeholder="Company *" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                              <input value={exp.duration} onChange={e => {
                                const newExp = [...resumeData.experience]
                                newExp[idx].duration = e.target.value
                                setResumeData(d => ({ ...d, experience: newExp }))
                              }} placeholder="Duration" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                            </div>
                            <textarea value={exp.responsibilities.join('\n')} onChange={e => {
                              const newExp = [...resumeData.experience]
                              newExp[idx].responsibilities = e.target.value.split('\n').filter(r => r.trim())
                              setResumeData(d => ({ ...d, experience: newExp }))
                            }} rows={4} placeholder="Responsibilities (one per line)" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                          </div>
                        ))}
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                          <Button onClick={() => setStep(4)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div key="projects" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-display text-xl">Projects</h3>
                          <Button variant="ghost" onClick={addProject} className="text-sm">+ Add Project</Button>
                        </div>
                        {resumeData.projects.map((proj, idx) => (
                          <div key={idx} className="space-y-4 mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input value={proj.title} onChange={e => {
                              const newProj = [...resumeData.projects]
                              newProj[idx].title = e.target.value
                              setResumeData(d => ({ ...d, projects: newProj }))
                            }} placeholder="Project Title *" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                            <textarea value={proj.description} onChange={e => {
                              const newProj = [...resumeData.projects]
                              newProj[idx].description = e.target.value
                              setResumeData(d => ({ ...d, projects: newProj }))
                            }} rows={3} placeholder="Description" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                            <input value={proj.tools} onChange={e => {
                              const newProj = [...resumeData.projects]
                              newProj[idx].tools = e.target.value
                              setResumeData(d => ({ ...d, projects: newProj }))
                            }} placeholder="Tools / Technologies" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                          </div>
                        ))}
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                          <Button onClick={() => setStep(5)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div key="skills" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                      <Card>
                        <h3 className="font-display text-xl mb-4">Skills</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          {(['technical', 'soft', 'tools', 'languages'] as const).map(type => (
                            <div key={type}>
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium capitalize">{type} Skills</label>
                                <Button variant="ghost" onClick={() => addSkill(type)} className="text-xs">+ Add</Button>
                              </div>
                              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                {resumeData.skills[type].map((skill, idx) => (
                                  <span key={idx} className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-sm flex items-center gap-2">
                                    {skill}
                                    <button onClick={() => {
                                      const newSkills = { ...resumeData.skills }
                                      newSkills[type] = newSkills[type].filter((_, i) => i !== idx)
                                      setResumeData(d => ({ ...d, skills: newSkills }))
                                    }} className="hover:text-red-600">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>
                          <Button onClick={() => setStep(6)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {step === 6 && (
                    <motion.div key="achievements" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                      <Card>
                        <h3 className="font-display text-xl mb-4">Achievements & Certifications</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Achievements (one per line)</label>
                            <textarea value={resumeData.achievements.join('\n')} onChange={e => setResumeData(d => ({ ...d, achievements: e.target.value.split('\n').filter(a => a.trim()) }))} rows={5} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" placeholder="Won hackathon 2024" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Certifications (one per line)</label>
                            <textarea value={resumeData.certifications.join('\n')} onChange={e => setResumeData(d => ({ ...d, certifications: e.target.value.split('\n').filter(c => c.trim()) }))} rows={5} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" placeholder="AWS Certified Solutions Architect" />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(5)}>Back</Button>
                          <Button onClick={() => setStep(7)} className="ml-auto">Next</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {step === 7 && (
                    <motion.div key="domain" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
                      <Card>
                        <h3 className="font-display text-xl mb-4">Select Domain</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">AI will optimize your resume with domain-specific keywords</p>
                        <div className="grid md:grid-cols-3 gap-3">
                          {DOMAINS.map(d => (
                            <motion.button key={d} onClick={() => setResumeData(data => ({ ...data, domain: d }))} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`p-4 rounded-xl border-2 transition text-sm font-medium ${resumeData.domain === d ? 'bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 border-brand-blue' : 'border-slate-300 dark:border-slate-600 hover:border-brand-blue/50'}`}>
                              {d}
                            </motion.button>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                          <Button variant="ghost" onClick={() => setStep(6)}>Back</Button>
                          <motion.button onClick={handleGenerate} disabled={loading} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }} className="btn-primary px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                            {loading ? (
                              <>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                <span>Generating with AI...</span>
                              </>
                            ) : (
                              '✨ Generate Resume'
                            )}
                          </motion.button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Generated Resume Preview */}
        {activeTab === 'analyze' && generatedResume && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Resume Preview - 2 columns */}
              <div className="md:col-span-2">
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-display text-2xl">Generated Resume</h2>
                    <div className="flex gap-3">
                      {atsScore !== null && (
                        <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          ATS Score: <span className="font-bold text-brand-blue">{atsScore}/100</span>
                        </div>
                      )}
                      <Button onClick={downloadPDF}>Download PDF</Button>
                      <Button variant="ghost" onClick={() => setGeneratedResume('')}>Edit Again</Button>
                    </div>
                  </div>
                  <div id="resume-preview" className="p-8 bg-white rounded-lg border border-slate-200 dark:border-slate-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: generatedResume }} />
                </Card>
              </div>

              {/* Analysis Sidebar */}
              <div className="md:col-span-1">
                <Card>
                  <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={runFullAnalysis}
                      disabled={analyzing || !hasUploaded}
                      className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      variant="outline"
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Resume'}
                    </Button>
                    {atsScore !== null && (
                      <div className="p-4 rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 border border-brand-blue/20">
                        <div className="text-3xl font-bold text-brand-blue mb-1">{atsScore}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">ATS Score</div>
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          {atsScore >= 80 ? 'Excellent!' : atsScore >= 60 ? 'Good, can improve' : 'Needs work'}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Full Analysis Results */}
            {showAnalysis && analysisData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-display text-2xl">AI-Powered Resume Analysis</h2>
                    <Button onClick={() => setShowAnalysis(false)} variant="ghost" size="sm">
                      Close
                    </Button>
                  </div>
                  <AnalysisResults data={analysisData} />
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'generate' && (
          <AiResumeGenerator />
        )}
      </div>
    </div>
  )
}
