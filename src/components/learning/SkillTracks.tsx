import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Plus, Play, BookOpen, Clock, Users, Star } from 'lucide-react'
import { useDomain } from '../../contexts/DomainProvider'
import { enhancedDomainApi } from '../../lib/enhancedApi'
import { toast } from 'react-hot-toast'
import SkillDrawer from './SkillDrawer'
import Skeleton from './Skeleton'

interface Skill {
  id: string
  name: string
  category: string
  trend_score: number
  demand_level: 'high' | 'medium' | 'low'
  avg_salary?: string
  related_skills: string[]
  resources: {
    videos: Array<{
      id: string
      title: string
      provider: string
      duration: string
      rating: number
      url: string
    }>
    courses: Array<{
      id: string
      title: string
      provider: string
      duration: string
      level: string
      rating: number
      url: string
    }>
  }
  prerequisites: string[]
  description: string
  learning_path: string[]
}

const SkillTracks: React.FC = () => {
  const { domain, filters } = useDomain()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [trackedSkills, setTrackedSkills] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTrendingSkills()
  }, [domain, filters])

  const fetchTrendingSkills = async () => {
    setLoading(true)
    try {
      const data = await enhancedDomainApi.getTrendingSkills()
      setSkills(data.skills || [])
    } catch (error) {
      console.error('Failed to fetch trending skills:', error)
      toast.error('Failed to load trending skills')
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill)
    setShowDrawer(true)
  }

  const handleTrackSkill = async (skillId: string) => {
    try {
      await domainAwareApi.trackProgress({
        type: 'skill',
        action: 'tracked',
        domain,
        metadata: { skill_id: skillId }
      })
      setTrackedSkills(prev => new Set(prev).add(skillId))
      toast.success('Skill added to your learning path')
    } catch (error) {
      console.error('Failed to track skill:', error)
      toast.error('Failed to track skill')
    }
  }

  const handleAddToPlaylist = async (skillId: string, resourceId: string, resourceType: 'video' | 'course') => {
    try {
      await domainAwareApi.addToPlaylist({
        skill_id: skillId,
        resource_id: resourceId,
        resource_type: resourceType,
        domain
      })
      toast.success('Added to your playlist')
    } catch (error) {
      console.error('Failed to add to playlist:', error)
      toast.error('Failed to add to playlist')
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

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400 bg-green-400/10 border-green-400'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400'
      case 'low': return 'text-red-400 bg-red-400/10 border-red-400'
      default: return 'text-dark-text-subtle bg-dark-bg-panelAlt border-dark-border'
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (skills.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto text-dark-text-subtle mb-4" />
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              No trending skills available
            </h3>
            <p className="text-dark-text-subtle mb-6">
              We couldn't find trending skills for your current domain and filters.
              Try adjusting your role or level settings.
            </p>
            <button
              onClick={fetchTrendingSkills}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark-text-primary flex items-center space-x-2">
              <TrendingUp className="w-6 h-6" />
              <span>Trending Skills in {domain.replace('_', '/').toUpperCase()}</span>
            </h2>
            <span className="text-sm text-dark-text-subtle">
              {skills.length} skills found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSkillClick(skill)}
                  className="bg-dark-bg-panel rounded-lg border border-dark-border p-4 hover:border-dark-border-hover transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-dark-text-primary group-hover:text-current transition-colors">
                      {skill.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getDemandColor(skill.demand_level)}`}>
                      {skill.demand_level}
                    </span>
                  </div>

                  <p className="text-sm text-dark-text-subtle mb-3 line-clamp-2">
                    {skill.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-dark-text-subtle mb-3">
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Score: {skill.trend_score}</span>
                    </span>
                    {skill.avg_salary && (
                      <span className="font-medium text-green-400">
                        {skill.avg_salary}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-dark-text-subtle">
                      <span className="flex items-center space-x-1">
                        <Play className="w-3 h-3" />
                        <span>{skill.resources.videos.length}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{skill.resources.courses.length}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTrackSkill(skill.id)
                        }}
                        className={`p-1 rounded transition-colors ${
                          trackedSkills.has(skill.id)
                            ? `${getDomainBg()} ${getDomainAccent()}`
                            : 'hover:bg-dark-bg-panelAlt'
                        }`}
                        title={trackedSkills.has(skill.id) ? 'Already tracking' : 'Track this skill'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSkillClick(skill)
                        }}
                        className={`p-1 rounded transition-colors ${getDomainBg()} ${getDomainAccent()}`}
                        title="View details"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Skill Drawer */}
      <SkillDrawer
        skill={selectedSkill}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onTrackSkill={handleTrackSkill}
        onAddToPlaylist={handleAddToPlaylist}
        trackedSkills={trackedSkills}
      />
    </section>
  )
}

export default SkillTracks