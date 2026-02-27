import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Clock, ExternalLink, CheckCircle, Circle, Download, BookOpen, Users } from 'lucide-react'
import { useDomain } from '../../contexts/DomainProvider'
import { enhancedDomainApi } from '../../lib/enhancedApi'
import { toast } from 'react-hot-toast'
import Skeleton from './Skeleton'

interface Certification {
  id: string
  name: string
  exam_code: string
  level: 'Entry' | 'Associate' | 'Professional' | 'Expert' | 'Specialty'
  prerequisites: string[]
  objectives: string[]
  official_link: string
  prep_links: Array<{
    title: string
    url: string
    type: 'video' | 'course' | 'book' | 'practice'
  }>
  prep_time: string
  cost: string
  validity_period?: string
  skills_validated: string[]
}

const CertificationRoadmap: React.FC = () => {
  const { domain, filters } = useDomain()
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [completedCerts, setCompletedCerts] = useState<Set<string>>(new Set())
  const [startedCerts, setStartedCerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCertifications()
  }, [domain, filters])

  const fetchCertifications = async () => {
    setLoading(true)
    try {
      const data = await enhancedDomainApi.getCertificationRoadmap({
        role: filters.role,
        level: filters.level
      })
      setCertifications(data.certifications || [])
    } catch (error) {
      console.error('Failed to fetch certifications:', error)
      toast.error('Failed to load certification roadmap')
      setCertifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkStarted = async (certId: string) => {
    try {
      await domainAwareApi.trackProgress({
        type: 'certification',
        action: 'started',
        domain,
        metadata: { certification_id: certId }
      })
      setStartedCerts(prev => new Set(prev).add(certId))
      toast.success('Certification marked as started')
    } catch (error) {
      console.error('Failed to mark certification as started:', error)
      toast.error('Failed to update certification status')
    }
  }

  const handleMarkCompleted = async (certId: string) => {
    try {
      await domainAwareApi.trackProgress({
        type: 'certification',
        action: 'completed',
        domain,
        metadata: { certification_id: certId }
      })
      setCompletedCerts(prev => new Set(prev).add(certId))
      setStartedCerts(prev => {
        const newSet = new Set(prev)
        newSet.delete(certId)
        return newSet
      })
      toast.success('Congratulations on completing the certification!')
    } catch (error) {
      console.error('Failed to mark certification as completed:', error)
      toast.error('Failed to update certification status')
    }
  }

  const handleExportRoadmap = async () => {
    try {
      // Generate PDF with certification roadmap
      const response = await enhancedDomainApi.exportRoadmap({
        certifications: certifications.map(cert => ({
          id: cert.id,
          name: cert.name,
          level: cert.level,
          status: completedCerts.has(cert.id) ? 'completed' : startedCerts.has(cert.id) ? 'started' : 'planned'
        }))
      })
      
      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${domain}-certification-roadmap.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Roadmap exported successfully')
    } catch (error) {
      console.error('Failed to export roadmap:', error)
      toast.error('Failed to export roadmap')
    }
  }

  const getDomainAccent = () => {
    const accents = {
      cybersec: 'text-domain-cybersec border-domain-cybersec',
      ai_ml: 'text-domain-ai_ml border-domain-ai_ml',
      data: 'text-domain-data border-domain-data',
      web: 'text-domain-web border-domain-web',
      cloud: 'text-domain-cloud border-domain-cloud',
      iot: 'text-domain-iot border-domain-iot'
    }
    return accents[domain]
  }

  const getDomainBg = () => {
    const bgColors = {
      cybersec: 'bg-domain-cybersec/10 hover:bg-domain-cybersec/20',
      ai_ml: 'bg-domain-ai_ml/10 hover:bg-domain-ai_ml/20',
      data: 'bg-domain-data/10 hover:bg-domain-data/20',
      web: 'bg-domain-web/10 hover:bg-domain-web/20',
      cloud: 'bg-domain-cloud/10 hover:bg-domain-cloud/20',
      iot: 'bg-domain-iot/10 hover:bg-domain-iot/20'
    }
    return bgColors[domain]
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'entry': return 'bg-green-400/10 text-green-400 border-green-400'
      case 'associate': return 'bg-blue-400/10 text-blue-400 border-blue-400'
      case 'professional': return 'bg-purple-400/10 text-purple-400 border-purple-400'
      case 'expert': return 'bg-red-400/10 text-red-400 border-red-400'
      case 'specialty': return 'bg-orange-400/10 text-orange-400 border-orange-400'
      default: return 'bg-dark-bg-panelAlt text-dark-text-subtle border-dark-border'
    }
  }

  const getStatusIcon = (certId: string) => {
    if (completedCerts.has(certId)) {
      return <CheckCircle className="w-6 h-6 text-green-400" />
    } else if (startedCerts.has(certId)) {
      return <Circle className="w-6 h-6 text-yellow-400" />
    }
    return <Circle className="w-6 h-6 text-dark-text-subtle" />
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (certifications.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <Award className="w-16 h-16 mx-auto text-dark-text-subtle mb-4" />
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              No certifications available
            </h3>
            <p className="text-dark-text-subtle mb-6">
              We couldn't find certifications for your current domain and filters.
              Try adjusting your role or level settings.
            </p>
            <button
              onClick={fetchCertifications}
              className={`px-6 py-2 rounded-lg border ${getDomainAccent()} ${getDomainBg()} transition-colors`}
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark-text-primary flex items-center space-x-2">
              <Award className="w-6 h-6" />
              <span>Certification Roadmap</span>
            </h2>
            <button
              onClick={handleExportRoadmap}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getDomainAccent()} ${getDomainBg()} transition-colors`}
            >
              <Download className="w-4 h-4" />
              <span>Export Roadmap</span>
            </button>
          </div>

          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-dark-bg-panelAlt rounded-lg p-4 border border-dark-border">
              <div className="flex items-center space-x-2 mb-2">
                <Circle className="w-5 h-5 text-dark-text-subtle" />
                <span className="text-sm text-dark-text-subtle">Planned</span>
              </div>
              <p className="text-2xl font-bold text-dark-text-primary">
                {certifications.length - completedCerts.size - startedCerts.size}
              </p>
            </div>
            <div className="bg-dark-bg-panelAlt rounded-lg p-4 border border-dark-border">
              <div className="flex items-center space-x-2 mb-2">
                <Circle className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-dark-text-subtle">In Progress</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {startedCerts.size}
              </p>
            </div>
            <div className="bg-dark-bg-panelAlt rounded-lg p-4 border border-dark-border">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-dark-text-subtle">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {completedCerts.size}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <AnimatePresence>
              {certifications.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline line */}
                  {index < certifications.length - 1 && (
                    <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-dark-border" />
                  )}

                  <div className="flex items-start space-x-4">
                    {/* Status indicator */}
                    <div className="flex-shrink-0 mt-2">
                      {getStatusIcon(cert.id)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-dark-bg-panel rounded-lg border border-dark-border p-6 hover:border-dark-border-hover transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-dark-text-primary">
                              {cert.name}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getLevelColor(cert.level)}`}>
                              {cert.level}
                            </span>
                          </div>
                          <p className="text-sm text-dark-text-subtle">
                            Exam Code: {cert.exam_code}
                          </p>
                        </div>
                        <a
                          href={cert.official_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg border ${getDomainBg()} ${getDomainAccent()} transition-colors`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Objectives */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                          Skills Validated
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {cert.skills_validated.slice(0, 4).map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="text-xs px-2 py-1 bg-dark-bg-panelAlt rounded border border-dark-border"
                            >
                              {skill}
                            </span>
                          ))}
                          {cert.skills_validated.length > 4 && (
                            <span className="text-xs px-2 py-1 bg-dark-bg-panelAlt rounded border border-dark-border">
                              +{cert.skills_validated.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prerequisites */}
                      {cert.prerequisites.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                            Prerequisites
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {cert.prerequisites.map((prereq, prereqIndex) => (
                              <span
                                key={prereqIndex}
                                className="text-xs px-2 py-1 bg-dark-bg-panelAlt rounded border border-dark-border"
                              >
                                {prereq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prep Links */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                          Preparation Resources
                        </h4>
                        <div className="space-y-2">
                          {cert.prep_links.map((link, linkIndex) => (
                            <a
                              key={linkIndex}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-dark-text-subtle hover:text-current transition-colors"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>{link.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex items-center space-x-6 text-sm text-dark-text-subtle mb-4">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{cert.prep_time}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Award className="w-4 h-4" />
                          <span>{cert.cost}</span>
                        </span>
                        {cert.validity_period && (
                          <span className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>Valid for {cert.validity_period}</span>
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-3">
                        {!completedCerts.has(cert.id) && (
                          <button
                            onClick={() => handleMarkStarted(cert.id)}
                            disabled={startedCerts.has(cert.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              startedCerts.has(cert.id)
                                ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400'
                                : `${getDomainBg()} ${getDomainAccent()} border border-current`
                            }`}
                          >
                            {startedCerts.has(cert.id) ? 'In Progress' : 'Mark Started'}
                          </button>
                        )}
                        {!completedCerts.has(cert.id) && startedCerts.has(cert.id) && (
                          <button
                            onClick={() => handleMarkCompleted(cert.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-400/10 text-green-400 border border-green-400 hover:bg-green-400/20 transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                        {completedCerts.has(cert.id) && (
                          <span className="flex items-center space-x-1 text-green-400 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CertificationRoadmap