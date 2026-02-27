import React from 'react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'
import ATSScoreDisplay from './ATSScoreDisplay'
import { trackProgress } from '../../lib/api'

type AnalysisData = {
  ats_score: number
  sub_scores?: {
    keyword: number
    section: number
    format: number
    impact: number
    conciseness: number
  }
  remarks?: string
  improvements?: string[]
  missing_skills?: string[]
  trending_skills?: {
    high_demand?: string[]
    emerging?: string[]
  }
  suggested_certifications?: Array<{
    name: string
    provider: string
    level: string
  }>
  recommended_resources?: Array<{
    skill: string
    resources: Array<{
      title: string
      url: string
      source: string
      estimated_time?: string
      level?: string
      reason?: string
    }>
  }>
  faults?: Array<{
    type: string
    severity: string
    message: string
    suggestion?: string
  }>
  explanation?: string
  plagiarism?: {
    plagiarism_score: number
    plagiarism_safe: boolean
  }
}

type Props = {
  data: AnalysisData
}

export default function AnalysisResults({ data }: Props) {
  const handleResourceClick = async (resource: any, skill: string) => {
    try {
      await trackProgress('course_clicked', {
        skill,
        resource_title: resource.title,
        resource_source: resource.source,
        resource_url: resource.url,
      })
      window.open(resource.url, '_blank')
    } catch (e) {
      window.open(resource.url, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with ATS Score */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-lg mb-4">ATS Score Analysis</h3>
          <ATSScoreDisplay score={data.ats_score} subScores={data.sub_scores} />
        </Card>

        <Card>
          <h3 className="font-semibold text-lg mb-4">AI Assessment</h3>
          {data.remarks && (
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              {data.remarks}
            </p>
          )}
          {data.explanation && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-200">{data.explanation}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Improvements & Faults */}
      {(data.improvements?.length || data.faults?.length) && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Improvement Suggestions</h3>
          <div className="space-y-3">
            {data.improvements?.map((imp, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <span className="text-amber-600 dark:text-amber-400 mt-0.5">💡</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{imp}</p>
              </motion.div>
            ))}
            {data.faults?.slice(0, 3).map((fault, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: (data.improvements?.length || 0) * 0.1 + idx * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <span className="text-red-600 dark:text-red-400 mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">{fault.message}</p>
                  {fault.suggestion && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">{fault.suggestion}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Trending Skills */}
      {data.trending_skills && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Trending Skills in Your Domain</h3>
          <div className="space-y-4">
            {data.trending_skills.high_demand && data.trending_skills.high_demand.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  High Demand Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.trending_skills.high_demand.map((skill, idx) => (
                    <motion.span
                      key={skill}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring' }}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
            {data.trending_skills.emerging && data.trending_skills.emerging.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Emerging Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.trending_skills.emerging.map((skill, idx) => (
                    <motion.span
                      key={skill}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring' }}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-medium"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Missing Skills */}
      {data.missing_skills && data.missing_skills.length > 0 && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Skills to Add</h3>
          <div className="flex flex-wrap gap-2">
            {data.missing_skills.map((skill, idx) => (
              <motion.span
                key={skill}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.05, type: 'spring' }}
                className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border-2 border-dashed"
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </Card>
      )}

      {/* Certifications */}
      {data.suggested_certifications && data.suggested_certifications.length > 0 && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Recommended Certifications</h3>
          <div className="space-y-3">
            {data.suggested_certifications.map((cert, idx) => (
              <motion.div
                key={cert.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{cert.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {cert.provider} • {cert.level}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    Cert
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Course Recommendations */}
      {data.recommended_resources && data.recommended_resources.length > 0 && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Recommended Learning Resources</h3>
          <div className="space-y-6">
            {data.recommended_resources.map((rec, recIdx) => (
              <div key={rec.skill} className="border-b border-slate-200 dark:border-slate-700 last:border-0 pb-6 last:pb-0">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Learn: <span className="text-brand-blue">{rec.skill}</span>
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {rec.resources.map((resource, resIdx) => (
                    <motion.button
                      key={resIdx}
                      onClick={() => handleResourceClick(resource, rec.skill)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue hover:shadow-md transition text-left group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-blue transition">
                            {resource.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400">
                              {resource.source}
                            </span>
                            {resource.estimated_time && (
                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {resource.estimated_time}
                              </span>
                            )}
                            {resource.level && (
                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {resource.level}
                              </span>
                            )}
                          </div>
                          {resource.reason && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                              {resource.reason}
                            </p>
                          )}
                        </div>
                        <span className="text-brand-blue opacity-0 group-hover:opacity-100 transition">
                          →
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plagiarism Check */}
      {data.plagiarism && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">Plagiarism Check</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">Plagiarism Score:</span>
                <span
                  className={`font-semibold ${
                    data.plagiarism.plagiarism_safe ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {data.plagiarism.plagiarism_score.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.plagiarism.plagiarism_score}%` }}
                  className={`h-full ${
                    data.plagiarism.plagiarism_safe ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
            {data.plagiarism.plagiarism_safe ? (
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium">
                Safe
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-medium">
                Review Needed
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

