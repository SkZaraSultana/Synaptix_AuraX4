import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Play, Clock, Bookmark, Trash2, ExternalLink, CheckCircle, RotateCcw } from 'lucide-react'
import { useDomain } from '../../contexts/DomainProvider'
import { enhancedDomainApi } from '../../lib/enhancedApi'
import { toast } from 'react-hot-toast'
import Skeleton from './Skeleton'

interface PlaylistItem {
  id: string
  type: 'video' | 'course' | 'resource'
  title: string
  provider: string
  duration: string
  url: string
  thumbnail?: string
  completed: boolean
  progress: number
  added_at: string
  tags: string[]
}

interface ActivityItem {
  id: string
  type: 'resource' | 'quiz' | 'coding' | 'certification' | 'skill'
  action: 'started' | 'completed' | 'bookmarked' | 'tracked'
  label: string
  timestamp: string
  metadata?: any
}

const PlaylistHistory: React.FC = () => {
  const { domain, filters } = useDomain()
  const [activeTab, setActiveTab] = useState<'playlist' | 'history'>('playlist')
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'video' | 'course' | 'resource'>('all')

  useEffect(() => {
    fetchPlaylist()
    fetchRecentActivity()
  }, [domain, filters])

  const fetchPlaylist = async () => {
    setLoading(true)
    try {
      const playlistData = await enhancedDomainApi.getUserPlaylist({
        filter: filterType === 'all' ? undefined : filterType
      })
      setPlaylist(playlistData.items || [])
    } catch (error) {
      console.error('Failed to fetch playlist:', error)
      toast.error('Failed to load playlist')
      setPlaylist([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const activityData = await enhancedDomainApi.getRecentActivity({
        limit: 20
      })
      setRecentActivity(activityData.activity || [])
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
      setRecentActivity([])
    }
  }

  const handleRemoveFromPlaylist = async (itemId: string) => {
    try {
      await enhancedDomainApi.removeFromPlaylist(itemId)
      setPlaylist(playlist.filter(item => item.id !== itemId))
      toast.success('Removed from playlist')
    } catch (error) {
      console.error('Failed to remove from playlist:', error)
      toast.error('Failed to remove item')
    }
  }

  const handleMarkAsComplete = async (itemId: string) => {
    try {
      await enhancedDomainApi.updatePlaylistProgress(itemId, { completed: true, progress: 100 })
      setPlaylist(playlist.map(item => 
        item.id === itemId ? { ...item, completed: true, progress: 100 } : item
      ))
      toast.success('Marked as complete')
    } catch (error) {
      console.error('Failed to update progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const handleStartResource = async (item: PlaylistItem) => {
    try {
      await enhancedDomainApi.trackProgress({
        type: 'resource',
        action: 'started',
        metadata: {
          resource_id: item.id,
          resource_type: item.type,
          title: item.title
        }
      })
      window.open(item.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to track resource start:', error)
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleReorder = (newOrder: PlaylistItem[]) => {
    setPlaylist(newOrder)
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'resource': return <Play className="w-4 h-4" />
      case 'quiz': return <CheckCircle className="w-4 h-4" />
      case 'coding': return <CheckCircle className="w-4 h-4" />
      case 'certification': return <Bookmark className="w-4 h-4" />
      case 'skill': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'resource': return 'text-blue-400 bg-blue-400/10 border-blue-400'
      case 'quiz': return 'text-green-400 bg-green-400/10 border-green-400'
      case 'coding': return 'text-purple-400 bg-purple-400/10 border-purple-400'
      case 'certification': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400'
      case 'skill': return 'text-pink-400 bg-pink-400/10 border-pink-400'
      default: return 'text-dark-text-subtle bg-dark-bg-panelAlt border-dark-border'
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
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
              <Bookmark className="w-6 h-6" />
              <span>Playlist & History</span>
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-dark-text-subtle">
                {activeTab === 'playlist' ? `${playlist.length} items` : `${recentActivity.length} activities`}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex space-x-1 bg-dark-bg-panelAlt rounded-lg p-1 border border-dark-border">
              <button
                onClick={() => setActiveTab('playlist')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'playlist'
                    ? `${getDomainBg()} ${getDomainAccent()} border border-current`
                    : 'text-dark-text-subtle hover:text-dark-text-primary'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>My Playlist</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? `${getDomainBg()} ${getDomainAccent()} border border-current`
                    : 'text-dark-text-subtle hover:text-dark-text-primary'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Recent Activity</span>
              </button>
            </div>

            {activeTab === 'playlist' && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-dark-bg-panelAlt border border-dark-border text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-domain-ai_ml"
              >
                <option value="all">All Types</option>
                <option value="video">Videos</option>
                <option value="course">Courses</option>
                <option value="resource">Resources</option>
              </select>
            )}
          </div>

          {/* Playlist Section */}
          {activeTab === 'playlist' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Playlist */}
              <div className="lg:col-span-2">
                <div className="bg-dark-bg-panel rounded-lg border border-dark-border p-6">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-4">
                    My Learning Queue
                  </h3>
                  
                  {playlist.length === 0 ? (
                    <div className="text-center py-12">
                      <Bookmark className="w-12 h-12 mx-auto text-dark-text-subtle mb-4" />
                      <p className="text-dark-text-subtle mb-2">No items in your playlist yet</p>
                      <p className="text-sm text-dark-text-subtle/70">
                        Start adding resources from the Resources Hub to build your learning queue
                      </p>
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={playlist}
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      <AnimatePresence>
                        {playlist.map((item) => (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-dark-bg-panelAlt rounded-lg border border-dark-border p-4 hover:border-dark-border-hover transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4 flex-1">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getDomainBg()}`}>
                                  {item.type === 'video' && <Play className="w-6 h-6" />}
                                  {item.type === 'course' && <Bookmark className="w-6 h-6" />}
                                  {item.type === 'resource' && <Bookmark className="w-6 h-6" />}
                                </div>
                                
                                <div className="flex-1">
                                  <h4 className="font-medium text-dark-text-primary mb-1">
                                    {item.title}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-dark-text-subtle">
                                    <span>{item.provider}</span>
                                    <span>{item.duration}</span>
                                    <span className="capitalize">{item.type}</span>
                                  </div>
                                  
                                  {item.progress > 0 && (
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between text-xs text-dark-text-subtle mb-1">
                                        <span>Progress</span>
                                        <span>{item.progress}%</span>
                                      </div>
                                      <div className="w-full bg-dark-bg-panel rounded-full h-1">
                                        <div
                                          className={`h-1 rounded-full ${getDomainAccent().replace('text-', 'bg-')}`}
                                          style={{ width: `${item.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                {!item.completed && (
                                  <>
                                    <button
                                      onClick={() => handleStartResource(item)}
                                      className={`p-2 rounded-lg transition-colors ${getDomainBg()} ${getDomainAccent()} border border-current`}
                                      title="Start learning"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMarkAsComplete(item.id)}
                                      className="p-2 rounded-lg bg-green-400/10 text-green-400 border border-green-400/30 hover:bg-green-400/20 transition-colors"
                                      title="Mark as complete"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleRemoveFromPlaylist(item.id)}
                                  className="p-2 rounded-lg bg-red-400/10 text-red-400 border border-red-400/30 hover:bg-red-400/20 transition-colors"
                                  title="Remove from playlist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="bg-dark-bg-panel rounded-lg border border-dark-border p-6">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-4">
                    Quick Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-text-subtle">Total Items</span>
                      <span className="font-semibold text-dark-text-primary">{playlist.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-text-subtle">Completed</span>
                      <span className="font-semibold text-green-400">
                        {playlist.filter(item => item.completed).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-text-subtle">In Progress</span>
                      <span className="font-semibold text-yellow-400">
                        {playlist.filter(item => item.progress > 0 && !item.completed).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-text-subtle">Completion Rate</span>
                      <span className="font-semibold text-dark-text-primary">
                        {playlist.length > 0
                          ? Math.round((playlist.filter(item => item.completed).length / playlist.length) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-bg-panel rounded-lg border border-dark-border p-6">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-4">
                    Recommended Next
                  </h3>
                  <p className="text-sm text-dark-text-subtle">
                    Based on your learning history and current progress
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* History Section */}
          {activeTab === 'history' && (
            <div className="bg-dark-bg-panel rounded-lg border border-dark-border p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-6">
                Recent Activity
              </h3>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-dark-text-subtle mb-4" />
                  <p className="text-dark-text-subtle mb-2">No recent activity</p>
                  <p className="text-sm text-dark-text-subtle/70">
                    Start learning to see your activity timeline
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start space-x-4 p-4 bg-dark-bg-panelAlt rounded-lg border border-dark-border"
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-dark-text-primary">
                            {activity.label}
                          </span>
                          <span className="text-xs text-dark-text-subtle">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-dark-text-subtle">
                          <span className="capitalize">{activity.type}</span>
                          <span>•</span>
                          <span className="capitalize">{activity.action}</span>
                          {activity.metadata?.score && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">
                                Score: {activity.metadata.score}/{activity.metadata.total}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default PlaylistHistory