import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

import Card from '../ui/Card'
import Button from '../ui/Button'
import { generateAiResume } from '../../lib/api'

type EducationEntryForm = {
  institution: string
  degree: string
  year: string
  gpa: string
  highlights: string
}

type ProjectEntryForm = {
  title: string
  description: string
  impact: string
  tools: string
  link: string
}

type ExperienceEntryForm = {
  title: string
  company: string
  location: string
  duration: string
  achievements: string
}

const DOMAINS = ['AI/ML', 'Cybersecurity', 'Data Science', 'Web Development', 'Cloud Computing', 'IoT', 'Robotics']
const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const emptyEducation: EducationEntryForm = { institution: '', degree: '', year: '', gpa: '', highlights: '' }
const emptyProject: ProjectEntryForm = { title: '', description: '', impact: '', tools: '', link: '' }
const emptyExperience: ExperienceEntryForm = { title: '', company: '', location: '', duration: '', achievements: '' }

const initialState = {
  name: '',
  email: '',
  phone: '',
  linkedin: '',
  github: '',
  summary: '',
  domain: DOMAINS[0],
  skills: [] as string[],
  skillInput: '',
  education: [emptyEducation],
  projects: [emptyProject],
  experience: [emptyExperience],
}

export default function AiResumeGenerator() {
  const [form, setForm] = useState(initialState)
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [structured, setStructured] = useState<any | null>(null)
  const [assets, setAssets] = useState<{ pdf?: string; docx?: string }>({})
  const [atsScore, setAtsScore] = useState<number | null>(null)

  const canGenerate = useMemo(() => {
    return Boolean(form.name && form.email && form.skills.length > 0 && form.education[0].institution && form.education[0].degree)
  }, [form])

  const handleSkillAdd = () => {
    const value = form.skillInput.trim()
    if (!value) return
    if (form.skills.includes(value)) {
      toast.error('Skill already added')
      return
    }
    setForm(prev => ({ ...prev, skills: [...prev.skills, value], skillInput: '' }))
  }

  const handleSkillRemove = (skill: string) => {
    setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
  }

  const handleEducationChange = (idx: number, key: keyof EducationEntryForm, value: string) => {
    setForm(prev => {
      const next = [...prev.education]
      next[idx] = { ...next[idx], [key]: value }
      return { ...prev, education: next }
    })
  }

  const handleProjectChange = (idx: number, key: keyof ProjectEntryForm, value: string) => {
    setForm(prev => {
      const next = [...prev.projects]
      next[idx] = { ...next[idx], [key]: value }
      return { ...prev, projects: next }
    })
  }

  const handleExperienceChange = (idx: number, key: keyof ExperienceEntryForm, value: string) => {
    setForm(prev => {
      const next = [...prev.experience]
      next[idx] = { ...next[idx], [key]: value }
      return { ...prev, experience: next }
    })
  }

  const addEducation = () => setForm(prev => ({ ...prev, education: [...prev.education, emptyEducation] }))
  const addProject = () => setForm(prev => ({ ...prev, projects: [...prev.projects, emptyProject] }))
  const addExperience = () => setForm(prev => ({ ...prev, experience: [...prev.experience, emptyExperience] }))

  const resetState = () => {
    setForm(initialState)
    setPreviewHtml('')
    setStructured(null)
    setAssets({})
    setAtsScore(null)
  }

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Please complete the required fields.')
      return
    }
    setIsGenerating(true)
    try {
      const res = await generateAiResume({
        name: form.name,
        domain: form.domain,
        contact: {
          email: form.email,
          phone: form.phone || undefined,
          linkedin: form.linkedin || undefined,
          github: form.github || undefined,
        },
        skills: form.skills,
        summary: form.summary || undefined,
        education: form.education
          .filter(edu => edu.institution || edu.degree)
          .map(edu => ({
            institution: edu.institution,
            degree: edu.degree,
            year: edu.year || undefined,
            gpa: edu.gpa || undefined,
            highlights: edu.highlights
              ? edu.highlights.split('\n').map(h => h.trim()).filter(Boolean)
              : undefined,
          })),
        projects: form.projects
          .filter(proj => proj.title)
          .map(proj => ({
            title: proj.title,
            description: proj.description || undefined,
            impact: proj.impact || undefined,
            tools: proj.tools
              ? proj.tools.split(',').map(t => t.trim()).filter(Boolean)
              : undefined,
            link: proj.link || undefined,
          })),
        experience: form.experience
          .filter(exp => exp.title)
          .map(exp => ({
            title: exp.title,
            company: exp.company || undefined,
            location: exp.location || undefined,
            duration: exp.duration || undefined,
            achievements: exp.achievements
              ? exp.achievements.split('\n').map(a => a.trim()).filter(Boolean)
              : undefined,
          })),
      })

      setPreviewHtml(res.data.preview_html)
      setStructured(res.data.structured_resume)
      setAssets({ pdf: res.data.generated_pdf_url, docx: res.data.generated_docx_url })
      setAtsScore(res.data.ats_score)
      toast.success('AI resume generated! Review and edit before downloading.')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to generate AI resume')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (type: 'pdf' | 'docx') => {
    if (type === 'pdf') {
      const element = document.getElementById('ai-resume-preview')
      if (!element) {
        toast.error('Nothing to export yet.')
        return
      }
      try {
        const html2pdf = (await import('html2pdf.js')).default
        await html2pdf()
          .set({
            margin: 0.5,
            filename: `${form.name || 'resume'}-gradgear.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          })
          .from(element)
          .save()
        toast.success('PDF downloaded with your latest edits.')
      } catch (error) {
        toast.error('Unable to export PDF at the moment.')
      }
      return
    }

    const url = type === 'pdf' ? assets.pdf : assets.docx
    if (!url) {
      toast.error(`No ${type.toUpperCase()} file available yet.`)
      return
    }
    window.open(`${apiBase}${url}`, '_blank', 'noopener')
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl mb-2">AI Resume Generator</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Fill in the essentials and let GradGear craft a polished, ATS-ready resume in seconds.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsOpen(true)} className="px-6">
              Generate Resume
            </Button>
            {previewHtml && (
              <Button variant="ghost" onClick={resetState}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Provide Your Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="+1 555 0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Domain *</label>
                  <select
                    value={form.domain}
                    onChange={e => setForm(prev => ({ ...prev, domain: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  >
                    {DOMAINS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">LinkedIn</label>
                  <input
                    value={form.linkedin}
                    onChange={e => setForm(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="https://linkedin.com/in/you"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">GitHub</label>
                  <input
                    value={form.github}
                    onChange={e => setForm(prev => ({ ...prev, github: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="https://github.com/you"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Professional Summary (optional)</label>
                <textarea
                  value={form.summary}
                  onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  placeholder="Aspiring AI engineer with focus on..."
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Skills *</label>
                <div className="flex gap-3">
                  <input
                    value={form.skillInput}
                    onChange={e => setForm(prev => ({ ...prev, skillInput: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSkillAdd()
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    placeholder="Add skills (press enter to add)"
                  />
                  <Button type="button" onClick={handleSkillAdd} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.skills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button
                        onClick={() => handleSkillRemove(skill)}
                        className="hover:text-red-600"
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-base">Education *</h4>
                  <Button variant="ghost" onClick={addEducation}>
                    + Add Education
                  </Button>
                </div>
                {form.education.map((edu, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-4 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                    <input
                      value={edu.institution}
                      onChange={e => handleEducationChange(idx, 'institution', e.target.value)}
                      placeholder="Institution *"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={edu.degree}
                      onChange={e => handleEducationChange(idx, 'degree', e.target.value)}
                      placeholder="Degree *"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={edu.year}
                      onChange={e => handleEducationChange(idx, 'year', e.target.value)}
                      placeholder="Graduation Year"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={edu.gpa}
                      onChange={e => handleEducationChange(idx, 'gpa', e.target.value)}
                      placeholder="CGPA"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <textarea
                      value={edu.highlights}
                      onChange={e => handleEducationChange(idx, 'highlights', e.target.value)}
                      placeholder="Highlights (one per line)"
                      rows={3}
                      className="md:col-span-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-base">Projects</h4>
                  <Button variant="ghost" onClick={addProject}>
                    + Add Project
                  </Button>
                </div>
                {form.projects.map((proj, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-4 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                    <input
                      value={proj.title}
                      onChange={e => handleProjectChange(idx, 'title', e.target.value)}
                      placeholder="Project Title"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={proj.tools}
                      onChange={e => handleProjectChange(idx, 'tools', e.target.value)}
                      placeholder="Tech Stack (comma separated)"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <textarea
                      value={proj.description}
                      onChange={e => handleProjectChange(idx, 'description', e.target.value)}
                      placeholder="Project summary (2-3 sentences)"
                      rows={3}
                      className="md:col-span-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <textarea
                      value={proj.impact}
                      onChange={e => handleProjectChange(idx, 'impact', e.target.value)}
                      placeholder="Key impact (numbers, metrics)"
                      rows={2}
                      className="md:col-span-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={proj.link}
                      onChange={e => handleProjectChange(idx, 'link', e.target.value)}
                      placeholder="Project link"
                      className="md:col-span-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-base">Experience (optional)</h4>
                  <Button variant="ghost" onClick={addExperience}>
                    + Add Experience
                  </Button>
                </div>
                {form.experience.map((exp, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-4 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                    <input
                      value={exp.title}
                      onChange={e => handleExperienceChange(idx, 'title', e.target.value)}
                      placeholder="Role"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={exp.company}
                      onChange={e => handleExperienceChange(idx, 'company', e.target.value)}
                      placeholder="Company"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={exp.location}
                      onChange={e => handleExperienceChange(idx, 'location', e.target.value)}
                      placeholder="Location"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      value={exp.duration}
                      onChange={e => handleExperienceChange(idx, 'duration', e.target.value)}
                      placeholder="Duration"
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <textarea
                      value={exp.achievements}
                      onChange={e => handleExperienceChange(idx, 'achievements', e.target.value)}
                      placeholder="Achievements (one per line with metrics)"
                      rows={3}
                      className="md:col-span-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-slate-500">
                  * Required fields. Provide impact metrics to strengthen bullets.
                </div>
                <Button onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="px-6">
                  {isGenerating ? 'Generating...' : 'Create My Resume'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {previewHtml && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display text-xl">Preview & Inline Edit</h3>
                  {atsScore !== null && (
                    <p className="text-sm text-slate-500 mt-1">
                      Estimated ATS Score: <span className="font-semibold text-brand-blue">{atsScore}/100</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownload('pdf')}>
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload('docx')}>
                    Download DOCX
                  </Button>
                </div>
              </div>
              <div
                id="ai-resume-preview"
                className="resume-preview prose max-w-none bg-white rounded-lg border border-slate-200 dark:border-slate-800 p-6"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                onBlur={e => setPreviewHtml(e.currentTarget.innerHTML)}
              />
              <p className="text-xs text-slate-500 mt-3">
                Tip: Click any section to edit wording before downloading. Changes stay in sync with downloads.
              </p>
            </Card>

            <Card>
              <h4 className="font-semibold text-lg mb-3">AI Sections</h4>
              {structured ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">Summary</div>
                    <p className="text-slate-600 dark:text-slate-400">{structured.summary}</p>
                  </div>
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">Primary Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {structured.sections?.skills?.primary?.map((skill: string) => (
                        <span key={skill} className="px-2 py-1 rounded bg-brand-blue/10 text-brand-blue">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">Projects</div>
                    <ul className="space-y-2">
                      {structured.sections?.projects?.map((project: any) => (
                        <li key={project.title} className="border border-slate-200 dark:border-slate-700 rounded-md p-2">
                          <div className="font-medium">{project.title}</div>
                          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400">
                            {(project.description || []).slice(0, 2).map((bullet: string, idx: number) => (
                              <li key={idx}>{bullet}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">Generate a resume to see AI-tailored sections and bullet points.</p>
              )}
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  )
}

