import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Circle, BookOpen, Code, Users, Trophy, Target, Zap } from 'lucide-react'
import { useDomain } from '../../contexts/DomainProvider'
import { enhancedDomainApi } from '../../lib/enhancedApi'
import { toast } from 'react-hot-toast'
import Skeleton from './Skeleton'

interface ChecklistItem {
  id: string
  title: string
  description: string
  rationale: string
  links: Array<{
    title: string
    url: string
    type: 'video' | 'article' | 'tutorial' | 'tool'
  }>
  estimated_time: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: 'foundation' | 'tooling' | 'project' | 'interview'
}

const BeginnersChecklist: React.FC = () => {
  const { domain, filters } = useDomain()
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    fetchBeginnerChecklist()
    fetchStreak()
  }, [domain, filters])

  const fetchBeginnerChecklist = async () => {
    setLoading(true)
    try {
      const data = await enhancedDomainApi.getBeginnerChecklist({
        role: filters.role,
        level: filters.level || 'Beginner'
      })
      setChecklist(data.checklist || [])
    } catch (error) {
      console.error('Failed to fetch beginner checklist:', error)
      toast.error('Failed to load beginner checklist')
      setChecklist([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStreak = async () => {
    try {
      const data = await enhancedDomainApi.getUserStreak()
      setStreak(data.streak || 0)
    } catch (error) {
      console.error('Failed to fetch streak:', error)
    }
  }

  const handleToggleComplete = async (itemId: string) => {
    const isCompleted = completedItems.has(itemId)
    
    try {
      await enhancedDomainApi.trackProgress({
        type: 'checklist',
        action: isCompleted ? 'uncompleted' : 'completed',
        metadata: { item_id: itemId }
      })

      if (isCompleted) {
        setCompletedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
        toast.success('Item marked as incomplete')
      } else {
        setCompletedItems(prev => new Set(prev).add(itemId))
        toast.success('Great job! Item completed')
        
        // Check if this was the last item
        if (completedItems.size + 1 === checklist.length) {
          toast.success('🎉 Congratulations! You completed the beginner checklist!')
        }
      }
      
      // Refresh streak
      fetchStreak()
    } catch (error) {
      console.error('Failed to toggle item completion:', error)
      toast.error('Failed to update item status')
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'foundation': return <BookOpen className="w-4 h-4" />
      case 'tooling': return <Code className="w-4 h-4" />
      case 'project': return <Trophy className="w-4 h-4" />
      case 'interview': return <Users className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400'
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400'
      default: return 'text-dark-text-subtle bg-dark-bg-panelAlt border-dark-border'
    }
  }

  const getProgressPercentage = () => {
    if (checklist.length === 0) return 0
    return Math.round((completedItems.size / checklist.length) * 100)
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (checklist.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <Zap className="w-16 h-16 mx-auto text-dark-text-subtle mb-4" />
            <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
              No beginner checklist available
            </h3>
            <p className="text-dark-text-subtle mb-6">
              We couldn't find beginner resources for your current domain.
              You might want to try a different domain or check back later.
            </p>
            <button
              onClick={fetchBeginnerChecklist}
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
              <Target className="w-6 h-6" />
              <span>For Absolute Beginners</span>
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-dark-text-subtle">Progress</p>
                <p className="text-lg font-bold text-dark-text-primary">
                  {getProgressPercentage()}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-dark-text-subtle">Streak</p>
                <p className="text-lg font-bold text-yellow-400 flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>{streak}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-dark-text-subtle mb-2">
              <span>Your Learning Journey</span>
              <span>{completedItems.size} of {checklist.length} completed</span>
            </div>
            <div className="w-full bg-dark-bg-panelAlt rounded-full h-2 border border-dark-border">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getDomainAccent().replace('text-', 'bg-')}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            <AnimatePresence>
              {checklist.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-dark-bg-panel rounded-lg border p-6 transition-all ${
                    completedItems.has(item.id)
                      ? 'border-green-400/50 bg-green-400/5'
                      : 'border-dark-border hover:border-dark-border-hover'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(item.id)}
                      className="flex-shrink-0 mt-1 p-1 rounded-full transition-colors"
                    >
                      {completedItems.has(item.id) ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-dark-text-subtle hover:text-current" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className={`text-lg font-semibold ${
                            completedItems.has(item.id) ? 'text-green-400' : 'text-dark-text-primary'
                          }`}>
                            {item.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(item.difficulty)}`}>
                              {item.difficulty}
                            </span>
                            <span className="flex items-center space-x-1 text-xs text-dark-text-subtle">
                              {getCategoryIcon(item.category)}
                              <span>{item.category}</span>
                            </span>
                          </div>
                        </div>
                        <span className="flex items-center space-x-1 text-xs text-dark-text-subtle">
                          <Clock className="w-3 h-3" />
                          <span>{item.estimated_time}</span>
                        </span>
                      </div>

                      <p className="text-dark-text-subtle mb-4 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="bg-dark-bg-panelAlt rounded-lg p-4 border border-dark-border mb-4">
                        <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                          Why This Matters
                        </h4>
                        <p className="text-sm text-dark-text-subtle">
                          {item.rationale}
                        </p>
                      </div>

                      {/* Links */}
                      <div>
                        <h4 className="text-sm font-medium text-dark-text-primary mb-2">
                          Resources to Get Started
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {item.links.map((link, linkIndex) => (
                            <a
                              key={linkIndex}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 rounded hover:bg-dark-bg-panelAlt transition-colors text-sm text-dark-text-subtle hover:text-current"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span className="truncate">{link.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Completion Message */}
          {completedItems.size === checklist.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-lg p-6 border border-green-400/30 text-center"
            >
              <Trophy className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold text-dark-text-primary mb-2">
                Congratulations! 🎉
              </h3>
              <p className="text-dark-text-subtle mb-4">
                You've completed the beginner checklist for {domain.replace('_', '/').toUpperCase()}.
                You're now ready to explore more advanced topics and start building real projects!
              </p>
              <button
                onClick={() => {/* Navigate to next section */}}
                className={`px-6 py-2 rounded-lg border ${getDomainAccent()} ${getDomainBg()} transition-colors`}
              >
                Continue Learning
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default BeginnersChecklist