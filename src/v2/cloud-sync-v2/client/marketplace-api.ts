/**
 * Marketplace API Client for api.claudehome.cn
 * Handles skill discovery, search, and recommendations
 */

import type {
  Categories,
  FeaturedSkills,
  RecommendedSkills,
  SearchQuery,
  SearchResults,
  SkillDetails,
  TrendingSkills,
} from './types.js'
import { APIClient } from './client.js'
import { API_PATHS } from './config.js'

export class MarketplaceAPIClient extends APIClient {
  /**
   * Search for skills
   */
  async searchSkills(query: SearchQuery): Promise<SearchResults> {
    return this.post<SearchResults>(API_PATHS.MARKETPLACE_SEARCH, query, {
      cache: true,
    })
  }

  /**
   * Get trending skills
   */
  async getTrendingSkills(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<TrendingSkills> {
    return this.get<TrendingSkills>(API_PATHS.MARKETPLACE_TRENDING, {
      params: { period },
      cache: true,
    })
  }

  /**
   * Get recommended skills
   */
  async getRecommendedSkills(
    algorithm: 'collaborative' | 'content-based' | 'hybrid' = 'hybrid',
  ): Promise<RecommendedSkills> {
    return this.get<RecommendedSkills>(API_PATHS.MARKETPLACE_RECOMMENDED, {
      params: { algorithm },
      cache: true,
    })
  }

  /**
   * Get featured skills
   */
  async getFeaturedSkills(): Promise<FeaturedSkills[]> {
    return this.get<FeaturedSkills[]>(API_PATHS.MARKETPLACE_FEATURED, {
      cache: true,
    })
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Categories> {
    return this.get<Categories>(API_PATHS.MARKETPLACE_CATEGORIES, {
      cache: true,
    })
  }

  /**
   * Get category by ID
   */
  async getCategory(categoryId: string): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.MARKETPLACE_CATEGORIES}/${categoryId}`, {
      cache: true,
    })
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(
    categoryId: string,
    options?: {
      page?: number
      pageSize?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    },
  ): Promise<SearchResults> {
    return this.get<SearchResults>(`${API_PATHS.MARKETPLACE_CATEGORIES}/${categoryId}/skills`, {
      params: options,
      cache: true,
    })
  }

  /**
   * Quick search with just a query string
   */
  async quickSearch(queryString: string, options?: {
    page?: number
    pageSize?: number
  }): Promise<SearchResults> {
    return this.searchSkills({
      query: queryString,
      ...options,
    })
  }

  /**
   * Search skills by tags
   */
  async searchByTags(tags: string[], options?: {
    language?: string
    page?: number
    pageSize?: number
  }): Promise<SearchResults> {
    return this.searchSkills({
      tags,
      ...options,
    })
  }

  /**
   * Get similar skills
   */
  async getSimilarSkills(skillId: string, limit: number = 10): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.SKILLS}/${skillId}/similar`, {
      params: { limit },
      cache: true,
    })
  }

  /**
   * Get related skills based on dependencies
   */
  async getRelatedSkills(skillId: string): Promise<{
    dependencies: SkillDetails[]
    dependents: SkillDetails[]
  }> {
    return this.get<{ dependencies: SkillDetails[], dependents: SkillDetails[] }>(
      `${API_PATHS.SKILLS}/${skillId}/related`,
      { cache: true },
    )
  }

  /**
   * Get popular skills
   */
  async getPopularSkills(options?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all-time'
    category?: string
    limit?: number
  }): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.MARKETPLACE_TRENDING}/popular`, {
      params: options,
      cache: true,
    })
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(options?: {
    category?: string
    limit?: number
  }): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.MARKETPLACE_TRENDING}/new`, {
      params: options,
      cache: true,
    })
  }

  /**
   * Get most downloaded skills
   */
  async getMostDownloaded(options?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'all-time'
    category?: string
    limit?: number
  }): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.MARKETPLACE_TRENDING}/downloads`, {
      params: options,
      cache: true,
    })
  }

  /**
   * Get highest rated skills
   */
  async getHighestRated(options?: {
    minRating?: number
    category?: string
    limit?: number
  }): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>(`${API_PATHS.MARKETPLACE_TRENDING}/rated`, {
      params: options,
      cache: true,
    })
  }

  /**
   * Browse marketplace with filters
   */
  async browse(filters: {
    category?: string
    language?: string
    tags?: string[]
    minRating?: number
    sortBy?: 'relevance' | 'rating' | 'downloads' | 'updated'
    sortOrder?: 'asc' | 'desc'
    page?: number
    pageSize?: number
  }): Promise<SearchResults> {
    return this.searchSkills(filters)
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    totalSkills: number
    totalDownloads: number
    totalCategories: number
    activeUsers: number
    averageRating: number
  }> {
    return this.get<any>('/marketplace/stats', { cache: true })
  }

  /**
   * Get skill installation count
   */
  async getSkillInstallCount(skillId: string): Promise<number> {
    const response = await this.get<{ count: number }>(
      `${API_PATHS.SKILLS}/${skillId}/stats/downloads`,
    )
    return response.count
  }

  /**
   * Get skill view count
   */
  async getSkillViewCount(skillId: string): Promise<number> {
    const response = await this.get<{ count: number }>(
      `${API_PATHS.SKILLS}/${skillId}/stats/views`,
    )
    return response.count
  }

  /**
   * Get skill rating breakdown
   */
  async getSkillRatingBreakdown(skillId: string): Promise<{
    average: number
    count: number
    distribution: {
      1: number
      2: number
      3: number
      4: number
      5: number
    }
  }> {
    return this.get<any>(`${API_PATHS.SKILLS}/${skillId}/stats/ratings`, {
      cache: true,
    })
  }

  /**
   * Report a skill
   */
  async reportSkill(skillId: string, reason: string, description: string): Promise<void> {
    await this.post('/reports', {
      entityType: 'skill',
      entityId: skillId,
      reason,
      description,
    })
  }

  /**
   * Bookmark a skill
   */
  async bookmarkSkill(skillId: string): Promise<void> {
    await this.post(`${API_PATHS.SKILLS}/${skillId}/bookmark`, {})
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(skillId: string): Promise<void> {
    await this.delete(`${API_PATHS.SKILLS}/${skillId}/bookmark`)
  }

  /**
   * Get bookmarked skills
   */
  async getBookmarkedSkills(): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>('/user/bookmarks', { cache: true })
  }

  /**
   * Get recently viewed skills
   */
  async getRecentlyViewed(limit: number = 10): Promise<SkillDetails[]> {
    return this.get<SkillDetails[]>('/user/history', {
      params: { limit },
      cache: true,
    })
  }

  /**
   * Clear view history
   */
  async clearViewHistory(): Promise<void> {
    await this.delete('/user/history')
  }

  /**
   * Get installation recommendations
   */
  async getInstallationRecommendations(): Promise<{
    skills: SkillDetails[]
    reasons: string[]
  }> {
    return this.get<any>('/user/recommendations/install', { cache: true })
  }
}

/**
 * Factory function to create Marketplace API client
 */
export function createMarketplaceClient(config?: import('./client.js').ClientConfig): MarketplaceAPIClient {
  return new MarketplaceAPIClient(config)
}
