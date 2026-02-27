import { domainAwareApi } from './domainApi'
import { 
  mockUserProfile, 
  mockRecommendations, 
  mockTrendingSkills, 
  mockVideos, 
  mockCourses, 
  mockCertifications,
  mockBeginnerChecklist,
  mockUserStreak,
  mockQuizQuestions,
  mockCodingChallenge,
  mockPlaylist,
  mockRecentActivity
} from './mockData'

// Enhanced API service with fallback handling
export class EnhancedDomainApi {
  private useMockData = false

  async getUserProfile() {
    try {
      return await domainAwareApi.getUserProfile()
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock user profile data')
      return mockUserProfile
    }
  }

  async getPersonalizedRecommendations(role?: string, level?: string) {
    try {
      return await domainAwareApi.getPersonalizedRecommendations(role, level)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock personalized recommendations')
      return mockRecommendations.personalized
    }
  }

  async getTrendingSkills() {
    try {
      return await domainAwareApi.getTrendingSkills()
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock trending skills')
      return mockTrendingSkills
    }
  }

  async getVideos(filters?: any) {
    try {
      return await domainAwareApi.getVideos(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock videos')
      return mockVideos
    }
  }

  async getCourses(filters?: any) {
    try {
      return await domainAwareApi.getCourses(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock courses')
      return mockCourses
    }
  }

  async getCertificationRoadmap(filters?: any) {
    try {
      return await domainAwareApi.getCertificationRoadmap(filters?.domain)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock certifications')
      return mockCertifications
    }
  }

  async getBeginnerChecklist(filters?: any) {
    try {
      return await domainAwareApi.getBeginnerChecklist(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock beginner checklist')
      return mockBeginnerChecklist
    }
  }

  async getUserStreak(filters?: any) {
    try {
      return await domainAwareApi.getUserStreak(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock user streak')
      return mockUserStreak
    }
  }

  async getQuizQuestions(filters?: any) {
    try {
      return await domainAwareApi.getQuizQuestions(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock quiz questions')
      return mockQuizQuestions
    }
  }

  async getCodingChallenge(filters?: any) {
    try {
      return await domainAwareApi.getCodingChallenge(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock coding challenge')
      return mockCodingChallenge
    }
  }

  async getUserPlaylist(filters?: any) {
    try {
      return await domainAwareApi.getUserPlaylist(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock playlist')
      return mockPlaylist
    }
  }

  async getRecentActivity(filters?: any) {
    try {
      return await domainAwareApi.getRecentActivity(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Using mock recent activity')
      return mockRecentActivity
    }
  }

  // Methods that should still work normally (non-critical)
  async trackProgress(data: any) {
    try {
      return await domainAwareApi.trackProgress(data)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Progress tracking failed, continuing without error')
      return { success: true, message: 'Progress tracked locally' }
    }
  }

  async addToPlaylist(data: any) {
    try {
      return await domainAwareApi.addToPlaylist(data)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Add to playlist failed, continuing without error')
      return { success: true, message: 'Added to local playlist' }
    }
  }

  async removeFromPlaylist(resourceId: string, domain?: string) {
    try {
      return await domainAwareApi.removeFromPlaylist(resourceId, domain)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Remove from playlist failed, continuing without error')
      return { success: true, message: 'Removed from local playlist' }
    }
  }

  async updatePlaylistProgress(resourceId: string, progress: any, domain?: string) {
    try {
      return await domainAwareApi.updatePlaylistProgress(resourceId, progress, domain)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Update playlist progress failed, continuing without error')
      return { success: true, message: 'Updated local progress' }
    }
  }

  async submitCode(data: any) {
    try {
      return await domainAwareApi.submitCode(data)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Code submission failed, providing mock feedback')
      return {
        success: true,
        score: 85,
        feedback: 'Good solution! Consider optimizing for better performance.',
        test_results: [
          { test: 'Test 1', passed: true },
          { test: 'Test 2', passed: true }
        ]
      }
    }
  }

  async exportRoadmap(filters?: any) {
    try {
      return await domainAwareApi.exportRoadmap(filters)
    } catch (error) {
      if (!this.useMockData) throw error
      console.warn('Export roadmap failed, providing mock data')
      return {
        success: true,
        download_url: 'data:text/plain;base64,SGVsbG8gV29ybGQh',
        filename: 'roadmap.pdf'
      }
    }
  }

  // Set domain method
  setDomain(domain: string) {
    domainAwareApi.setDomain(domain)
  }

  enableMockData(value: boolean) {
    this.useMockData = value
  }
}

// Export singleton instance
export const enhancedDomainApi = new EnhancedDomainApi()