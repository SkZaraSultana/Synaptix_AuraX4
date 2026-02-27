import axios from 'axios'
import authStore from '../store/auth'

const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const api = axios.create({ baseURL: apiBase + '/api' })

api.interceptors.request.use((config) => {
  const token = authStore.getState().token
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any)['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      authStore.getState().logout()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    // Better error logging
    if (err?.response) {
      console.error('API Error:', err.response.status, err.response.data)
    }
    return Promise.reject(err)
  }
)

// Mock helpers
function mock<T>(data: T, delay = 600): Promise<{ data: T }> {
  return new Promise(resolve => setTimeout(() => resolve({ data }), delay))
}

export function analyzeSkills(payload: { skills?: string[]; resume?: string }) {
  // return api.post('/skills/analyze', payload)
  return mock({
    missingSkills: [
      { name: 'TensorFlow', level: 'Intermediate', trend: [12,14,18,20] },
      { name: 'Kubernetes', level: 'Beginner', trend: [5,7,9,12] },
    ],
    projects: [
      { title: 'ML Pipeline on Kubeflow', tags: ['ML','K8s'], difficulty: 'Hard', github: 'https://github.com/search?q=kubeflow' },
      { title: 'Resume Parser with SpaCy', tags: ['NLP'], difficulty: 'Medium', github: 'https://github.com/search?q=spacy+resume' }
    ],
    courses: [
      { title: 'DeepLearning.AI TensorFlow', provider: 'Coursera' },
      { title: 'Kubernetes for Devs', provider: 'Udemy' }
    ]
  })
}

export function generateResume(payload: { summary: string; skills: string[] }) {
  // return api.post('/resume/generate', payload)
  return mock({
    content: 'Generated resume content with quantified achievements and ATS-friendly keywords.'
  })
}

export function trendsSkills() {
  // return api.get('/trends/skills')
  return mock({
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    series: [
      { name: 'GenAI', data: [10,14,20,28,34,40] },
      { name: 'Kubernetes', data: [8,11,16,19,23,27] }
    ]
  })
}

export default api

// Domain preferences
export function getUserDomain() { return api.get('/user/domain') }
export function setUserDomain(domains: string[]) { return api.post('/user/domain', { domains }) }

// Auth
export function registerUser(payload: {
  name: string
  email: string
  password: string
  college?: string
  year?: string
  domain?: string
  role?: 'student' | 'recruiter'
}) {
  return api.post('/register', payload)
}
export function loginUser(payload: {email:string;password:string}) {
  return api.post('/login', payload)
}
export function getProfile() { return api.get('/user/profile') }

// Resume
export function uploadResume(file: File) {
  const form = new FormData()
  form.append('file', file)
  return api.post('/resume/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function analyzeResume(resumeId?: number) {
  if (resumeId) {
    const form = new FormData()
    form.append('resume_id', resumeId.toString())
    return api.post('/resume/analyze', form)
  } else {
    // Send empty JSON body when no resume_id (will use latest resume)
    return api.post('/resume/analyze', {})
  }
}

export function generateResumeApi(payload: {
  name: string
  domain: string
  skills: string[]
  achievements: string[]
  personal?: { [key: string]: string }
  education?: Array<{ [key: string]: string }>
  experience?: Array<{ [key: string]: any }>
  projects?: Array<{ [key: string]: string }>
}) {
  return api.post('/resume/generate', payload)
}

export function generateAiResume(payload: {
  name: string
  domain: string
  contact: {
    email: string
    phone?: string
    linkedin?: string
    github?: string
  }
  skills: string[]
  education: Array<{
    institution: string
    degree: string
    year?: string
    gpa?: string
    highlights?: string[]
  }>
  projects?: Array<{
    title: string
    description?: string
    impact?: string
    tools?: string[]
    link?: string
  }>
  experience?: Array<{
    title: string
    company?: string
    location?: string
    duration?: string
    achievements?: string[]
  }>
  summary?: string
}) {
  return api.post('/resume/generate-ai', payload)
}

export function getSkillRecommendations(domain: string, skills?: string[]) {
  const params = new URLSearchParams()
  params.append('domain', domain)
  if (skills) params.append('skills', skills.join(','))
  return api.get(`/resume/recommendations/skills?${params.toString()}`)
}

export function trackProgress(activityType: string, activityData: any) {
  const form = new FormData()
  form.append('activity_type', activityType)
  form.append('activity_data', JSON.stringify(activityData))
  return api.post('/resume/track-progress', form)
}

// Recommendations
export function getRecommendations(domain: string) { return api.get(`/recommendations/${encodeURIComponent(domain)}`) }

// Learning resources & roadmap
export function getLearningPath(domain: string) {
  return api.get('/learning/path', { params: { domain } })
}

export function getDomainResources(domain: string, skill?: string) {
  return api.get('/resources', { params: { domain, skill } })
}

export function getCertifications(domain: string) {
  return api.get('/certifications', { params: { domain } })
}

export function getDomainProjects(domain: string, params?: { difficulty?: string; time?: string }) {
  return api.get('/projects', { params: { domain, ...params } })
}

export function getProjectDetail(projectId: string) {
  return api.get(`/projects/${projectId}`)
}

export function startProject(projectId: string, payload?: { overwrite?: boolean }) {
  return api.post(`/projects/${projectId}/start`, payload ?? { overwrite: false })
}

export function completeProjectStep(projectId: string, stepId: string) {
  return api.post(`/projects/${projectId}/steps/complete`, { step_id: stepId })
}

export function submitProject(projectId: string, githubUrl: string) {
  return api.post(`/projects/${projectId}/submit`, { github_url: githubUrl })
}

// Quiz & Coding
export function getQuiz(domain: string, mode: string, difficulty: string) {
  return api.get('/quiz', { params: { domain, mode, difficulty } })
}
export function submitQuizResult(payload: {
  domain: string
  mode: string
  difficulty: string
  score: number
  total_questions: number
  total_time_taken?: number
  responses: Array<{ id: string; selected: number; correct: number; correctLabel: string; explanation: string; skill?: string; time_taken?: number }>
}) {
  return api.post('/quiz/submit', payload)
}

// Coding practice
export function getCodingTracks() {
  return api.get('/coding/tracks')
}

export function getCodingTasks(trackId: string) {
  return api.get(`/coding/tracks/${trackId}/tasks`)
}

export function getCodingTaskDetail(taskId: string) {
  return api.get(`/coding/tasks/${taskId}`)
}

export function runCodingTask(taskId: string, code: string) {
  return api.post(`/coding/tasks/${taskId}/run`, { code })
}

export function submitCodingTask(taskId: string, code: string) {
  return api.post(`/coding/tasks/${taskId}/submit`, { code })
}

export function getUserInsights() {
  return api.get('/intelligence/user/insights')
}

export function getTrendingSkills(params: { domain: string }) {
  return api.get('/intelligence/trending', { params })
}

export function getSkillGap(params: { domain: string }) {
  return api.get('/intelligence/skill-gap', { params })
}

export function getCodingOverview(params?: { domain?: string }) {
  return api.get('/coding/overview', { params })
}

export function getCodingLesson(skill: string, params?: { domain?: string }) {
  return api.get('/coding/lesson', { params: { skill, ...(params ?? {}) } })
}

export function getNextCodingQuestion(params?: { domain?: string; level?: string }) {
  return api.get('/coding/question/next', { params })
}

export function submitCodingQuestion(payload: { question_id: string; code: string; language?: string }) {
  return api.post('/coding/submit', {
    question_id: payload.question_id,
    code: payload.code,
    language: payload.language,
  })
}

export function requestCodingHint(payload: { question_id: string; attempt?: number; code_snapshot?: string }) {
  return api.post('/coding/hint', payload)
}

export function updateCodingTrackProgress(payload: { track_id: string; item_id: string; status: 'not-started' | 'in-progress' | 'completed' }) {
  return api.post('/coding/track', payload)
}

export function getCodingTrackContent(params?: { domain?: string; level?: string }) {
  return api.get('/coding/track', { params })
}

// Leaderboard
export function getLeaderboard(limit?: number) { return api.get('/leaderboard', { params: { limit } }) }

// Progress
export function getUserProgress() { return api.get('/user/progress') }

// Matching & explainable ranking
export function updateUserSkills(payload: { skills: Array<{ name: string; proficiency_level: number }> }) {
  return api.post('/matching/user/skills', payload)
}

export function createMatchingProject(payload: {
  title: string
  description: string
  requirements: Array<{ skill_name: string; required_level: number; weight: number }>
}) {
  return api.post('/matching/projects', payload)
}

export function getMatchingProjects() {
  return api.get('/matching/projects')
}

export function applyToMatchingProject(projectId: number) {
  return api.post(`/matching/projects/${projectId}/apply`)
}

export function getProjectCandidates(projectId: number, fairness: boolean) {
  return api.get(`/matching/projects/${projectId}/candidates`, { params: { fairness } })
}

export function getStudentApplications() {
  return api.get('/matching/student/applications')
}

