import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, BookOpen, Clock, TrendingUp } from 'lucide-react'
import { useDomain } from '../../contexts/DomainProvider'
import { enhancedDomainApi } from '../../lib/enhancedApi'
import { toast } from 'react-hot-toast'
import Skeleton from './Skeleton'

interface Recommendation {
  id: string
  topic: string
  resource: {
    title: string
    type: 'video' | 'course' | 'article'
    url: string
    duration: string
  }
  rationale: string
  skill_level: string
  estimated_time: string
}

const PersonalizedStart: React.FC = () => {
  const { domain, filters } = useDomain()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [startingPlan, setStartingPlan] = useState(false)

  useEffect(() => {
    fetchRecommendations()
  }, [domain, filters])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const data = await enhancedDomainApi.getPersonalizedRecommendations(filters.role, filters.level)
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      toast.error('Failed to load personalized recommendations')
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartPlan = async () => {
    setStartingPlan(true)
    try {
      await domainAwareApi.trackProgress({
        type: 'plan',
        action: 'started',
        domain,
        metadata: {
          recommendations_count: recommendations.length,
          filters: { role: filters.role, level: filters.level }
        }
      })
      toast.success('Learning plan started!')
      // Navigate to first recommendation or show next steps
    } catch (error) {
      console.error('Failed to track plan start:', error)
      toast.error('Failed to start learning plan')
    } finally {
      setStartingPlan(false)
    }
  }

  const getDomainAccent = () => {
    const accents = {
      cybersec: 'text-domain-cybersec',
      ai_ml: 'text-domain-ai_ml',
      data: 'text-domain-data',
      web: 'text-domain-web',
      cloud: 'text-domain-cloud',
      iot: 'text-domain-iot'
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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4" />
      case 'course': return <BookOpen className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (recommendations.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-dark-text-subtle mb-4" />
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              No personalized recommendations available
            </h3>
            <p className="text-dark-text-subtle mb-6">
              We couldn't find recommendations for your current domain and filters.
              Try adjusting your role or level settings.
            </p>
            <button
              onClick={fetchRecommendations}
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
            <h2 className="text-2xl font-bold text-dark-text-primary">
              Your Recommended Path
            </h2>
            <button
              onClick={handleStartPlan}
              disabled={startingPlan}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${getDomainBg()} ${getDomainAccent()} border border-current`}
            >
              {startingPlan ? 'Starting...' : 'Start Plan'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-dark-bg-panel rounded-lg border border-dark-border p-6 hover:border-dark-border-hover transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-dark-text-primary flex-1">
                      {rec.topic}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getDomainAccent()}`}>
                      {rec.skill_level}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {getResourceIcon(rec.resource.type)}
                      <span className="text-sm font-medium text-dark-text-primary">
                        {rec.resource.title}
                      </span>
                    </div>
                    <p className="text-sm text-dark-text-subtle mb-2">
                      {rec.rationale}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-dark-text-subtle">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{rec.estimated_time}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>{rec.resource.duration}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => window.open(rec.resource.url, '_blank')}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getDomainBg()} ${getDomainAccent()} border border-current`}
                  >
                    Start Learning
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default PersonalizedStart