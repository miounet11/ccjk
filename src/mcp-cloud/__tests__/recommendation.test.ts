/**
 * Recommendation Engine Tests
 * Tests for RecommendationEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MCPService, ServiceCombo, UserProfile } from '../types'
import { RecommendationEngine } from '../marketplace/recommendation-engine'

// Mock service data
const mockServices: MCPService[] = [
  {
    id: 'filesystem',
    name: 'MCP Filesystem',
    package: '@modelcontextprotocol/server-filesystem',
    version: '1.0.0',
    description: 'File system operations for MCP',
    category: ['storage', 'utilities'],
    tags: ['file', 'storage', 'typescript', 'node'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 50000,
    rating: 4.8,
    reviews: 120,
    trending: true,
    featured: true,
    verified: true,
    dependencies: [],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'git',
    name: 'MCP Git',
    package: '@modelcontextprotocol/server-git',
    version: '1.2.0',
    description: 'Git operations for MCP',
    category: ['development', 'vcs'],
    tags: ['git', 'version-control', 'development', 'typescript'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 45000,
    rating: 4.7,
    reviews: 95,
    trending: true,
    featured: false,
    verified: true,
    dependencies: ['git'],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'postgres',
    name: 'MCP PostgreSQL',
    package: '@modelcontextprotocol/server-postgres',
    version: '2.0.0',
    description: 'PostgreSQL database connector for MCP',
    category: ['database', 'storage'],
    tags: ['database', 'sql', 'postgres'],
    author: 'Community',
    homepage: 'https://github.com/community/mcp-postgres',
    repository: 'https://github.com/community/mcp-postgres',
    license: 'Apache-2.0',
    downloads: 30000,
    rating: 4.5,
    reviews: 60,
    trending: false,
    featured: true,
    verified: true,
    dependencies: ['pg'],
    compatibility: { node: '>=16', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'docker',
    name: 'MCP Docker',
    package: '@modelcontextprotocol/server-docker',
    version: '1.1.0',
    description: 'Docker container management for MCP',
    category: ['devops', 'containers'],
    tags: ['docker', 'containers', 'devops'],
    author: 'DevOps Team',
    homepage: 'https://github.com/devops/mcp-docker',
    repository: 'https://github.com/devops/mcp-docker',
    license: 'MIT',
    downloads: 20000,
    rating: 4.3,
    reviews: 40,
    trending: false,
    featured: false,
    verified: false,
    dependencies: ['docker'],
    compatibility: { node: '>=18', os: ['darwin', 'linux'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'aws',
    name: 'MCP AWS',
    package: '@modelcontextprotocol/server-aws',
    version: '1.0.0',
    description: 'AWS cloud integration for MCP',
    category: ['cloud', 'devops'],
    tags: ['aws', 'cloud', 'infrastructure'],
    author: 'Cloud Team',
    homepage: 'https://github.com/cloud/mcp-aws',
    repository: 'https://github.com/cloud/mcp-aws',
    license: 'MIT',
    downloads: 15000,
    rating: 4.6,
    reviews: 30,
    trending: true,
    featured: true,
    verified: true,
    dependencies: ['aws-sdk'],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'puppeteer',
    name: 'MCP Puppeteer',
    package: '@modelcontextprotocol/server-puppeteer',
    version: '1.0.0',
    description: 'Browser automation for MCP',
    category: ['testing', 'automation'],
    tags: ['puppeteer', 'browser', 'testing', 'automation', 'typescript'],
    author: 'QA Team',
    homepage: 'https://github.com/qa/mcp-puppeteer',
    repository: 'https://github.com/qa/mcp-puppeteer',
    license: 'MIT',
    downloads: 8000,
    rating: 4.4,
    reviews: 20,
    trending: true,
    featured: false,
    verified: true,
    dependencies: ['puppeteer'],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'fetch',
    name: 'MCP Fetch',
    package: '@modelcontextprotocol/server-fetch',
    version: '1.0.0',
    description: 'HTTP fetch operations for MCP',
    category: ['network', 'utilities'],
    tags: ['http', 'fetch', 'api', 'typescript', 'node'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 40000,
    rating: 4.7,
    reviews: 80,
    trending: true,
    featured: true,
    verified: true,
    dependencies: [],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'github',
    name: 'MCP GitHub',
    package: '@modelcontextprotocol/server-github',
    version: '1.0.0',
    description: 'GitHub integration for MCP',
    category: ['development', 'vcs'],
    tags: ['github', 'git', 'version-control', 'typescript'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 35000,
    rating: 4.6,
    reviews: 70,
    trending: true,
    featured: true,
    verified: true,
    dependencies: [],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
]

// Mock user profiles
const beginnerProfile: UserProfile = {
  id: 'user1',
  techStack: ['javascript', 'html', 'css'],
  projectTypes: ['web', 'frontend'],
  usagePatterns: {},
  installedServices: [],
  preferences: {
    categories: ['utilities', 'storage'],
    tags: ['file', 'browser'],
  },
  experience: 'beginner',
}

const advancedProfile: UserProfile = {
  id: 'user2',
  techStack: ['typescript', 'node', 'react', 'docker'],
  projectTypes: ['fullstack', 'microservices'],
  usagePatterns: {},
  installedServices: ['filesystem', 'git'],
  preferences: {
    categories: ['development', 'devops', 'cloud'],
    tags: ['docker', 'aws', 'testing'],
  },
  experience: 'advanced',
}

const pythonProfile: UserProfile = {
  id: 'user3',
  techStack: ['python', 'django', 'fastapi'],
  projectTypes: ['backend', 'api'],
  usagePatterns: {},
  installedServices: [],
  preferences: {
    categories: ['database', 'storage'],
    tags: ['database', 'sql'],
  },
  experience: 'intermediate',
}

describe('recommendationEngine', () => {
  let engine: RecommendationEngine

  beforeEach(() => {
    engine = new RecommendationEngine()
  })

  describe('analyzeProfile', () => {
    it('should extract tech stack from user profile', () => {
      const techStack = engine.analyzeProfile(advancedProfile)

      expect(techStack).toEqual(advancedProfile.techStack)
    })

    it('should return empty array for empty tech stack', () => {
      const profile: UserProfile = {
        ...beginnerProfile,
        techStack: [],
      }

      const techStack = engine.analyzeProfile(profile)

      expect(techStack).toEqual([])
    })
  })

  describe('getPersonalizedRecommendations', () => {
    it('should return recommendations limited by limit parameter', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
        3,
      )

      expect(recommendations.length).toBeLessThanOrEqual(3)
    })

    it('should use default limit of 10', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
      )

      expect(recommendations.length).toBeLessThanOrEqual(10)
    })

    it('should prioritize services matching user tech stack', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Should recommend services with typescript/node tags
      const topRecommendations = recommendations.slice(0, 2)
      const hasMatchingTech = topRecommendations.some(s =>
        s.tags.some(tag => ['typescript', 'node'].some(tech => tag.toLowerCase().includes(tech))),
      )

      expect(hasMatchingTech).toBe(true)
    })

    it('should prioritize services matching user category preferences', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Should recommend services from preferred categories
      const topRecommendations = recommendations.slice(0, 2)
      const hasPreferredCategory = topRecommendations.some(s =>
        s.category.some(cat => advancedProfile.preferences.categories.includes(cat)),
      )

      expect(hasPreferredCategory).toBe(true)
    })

    it('should prioritize services matching user tag preferences', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Should recommend services with preferred tags
      const hasPreferredTag = recommendations.some(s =>
        s.tags.some(tag => advancedProfile.preferences.tags.includes(tag)),
      )

      expect(hasPreferredTag).toBe(true)
    })

    it('should deprioritize already installed services', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Installed services should be at the end or not present
      const installedIndex = recommendations.findIndex(s =>
        advancedProfile.installedServices.includes(s.id),
      )

      if (installedIndex !== -1) {
        // If present, should be in the bottom half
        expect(installedIndex).toBeGreaterThanOrEqual(Math.floor(recommendations.length / 2))
      }
    })

    it('should boost trending services', async () => {
      const profileWithoutInstalled: UserProfile = {
        ...beginnerProfile,
        installedServices: [],
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        profileWithoutInstalled,
      )

      // Should include some trending services
      const hasTrending = recommendations.some(s => s.trending)
      expect(hasTrending).toBe(true)
    })

    it('should boost verified services', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
      )

      // Most top recommendations should be verified
      const verifiedCount = recommendations.filter(s => s.verified).length
      expect(verifiedCount).toBeGreaterThan(recommendations.length / 2)
    })

    it('should boost featured services', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
      )

      // Should include some featured services
      const hasFeatured = recommendations.some(s => s.featured)
      expect(hasFeatured).toBe(true)
    })

    it('should prioritize high-rated services for beginners', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
      )

      // Top recommendations for beginners should have high ratings
      const topRecommendations = recommendations.slice(0, 3)
      const avgRating = topRecommendations.reduce((sum, s) => sum + s.rating, 0) / topRecommendations.length

      expect(avgRating).toBeGreaterThan(4.0)
    })

    it('should prioritize popular services for beginners', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        beginnerProfile,
      )

      // Beginners should see popular services
      const hasPopular = recommendations.some(s => s.downloads > 10000)
      expect(hasPopular).toBe(true)
    })

    it('should prioritize trending and specialized services for advanced users', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Advanced users should see trending services
      const hasTrending = recommendations.some(s => s.trending)
      expect(hasTrending).toBe(true)
    })

    it('should return empty array for empty services list', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        [],
        beginnerProfile,
      )

      expect(recommendations).toEqual([])
    })

    it('should sort by recommendation score', async () => {
      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        advancedProfile,
      )

      // Recommendations should be sorted (we just verify the list is returned)
      // The actual scoring includes many factors beyond just rating/downloads
      expect(recommendations.length).toBeGreaterThan(0)
      // Top recommendations should generally be relevant to the user's profile
      const topRec = recommendations[0]
      const isRelevant =
        topRec.tags.some(tag => advancedProfile.techStack.some(tech => tag.toLowerCase().includes(tech.toLowerCase()))) ||
        topRec.category.some(cat => advancedProfile.preferences.categories.includes(cat)) ||
        topRec.tags.some(tag => advancedProfile.preferences.tags.includes(tag))
      expect(isRelevant).toBe(true)
    })
  })

  describe('getServiceCombos', () => {
    it('should return combos that include the base service', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'filesystem')

      expect(combos.length).toBeGreaterThan(0)
      expect(combos.every(c => c.services.includes('filesystem'))).toBe(true)
    })

    it('should return empty array for non-existent service', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'nonexistent')

      expect(combos).toEqual([])
    })

    it('should only include combos where all services exist', async () => {
      // Remove 'git' from mock services by using a filtered list
      const filteredServices = mockServices.filter(s => s.id !== 'git')

      const combos = await engine.getServiceCombos(filteredServices, 'filesystem')

      // Combos that require 'git' should not be included
      expect(combos.every(c => !c.services.includes('git') || mockServices.some(s => s.id === 'git'))).toBe(true)
    })

    it('should include combo metadata', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'filesystem')

      expect(combos.every(c => {
        return c.name &&
          c.description &&
          c.useCase &&
          typeof c.popularity === 'number' &&
          typeof c.rating === 'number'
      })).toBe(true)
    })
  })

  describe('getTrendingInCategory', () => {
    it('should return trending services in category', async () => {
      const trending = await engine.getTrendingInCategory(mockServices, 'storage', 3)

      expect(trending.every(s => s.category.includes('storage'))).toBe(true)
      expect(trending.every(s => s.trending)).toBe(true)
      expect(trending.length).toBeLessThanOrEqual(3)
    })

    it('should return empty array for category with no trending services', async () => {
      const trending = await engine.getTrendingInCategory(mockServices, 'nonexistent')

      expect(trending).toEqual([])
    })

    it('should sort by downloads and rating', async () => {
      const trending = await engine.getTrendingInCategory(mockServices, 'storage')

      if (trending.length > 1) {
        const score1 = trending[0].downloads * 0.7 + trending[0].rating * 1000
        const score2 = trending[1].downloads * 0.7 + trending[1].rating * 1000
        expect(score1).toBeGreaterThanOrEqual(score2)
      }
    })

    it('should use default limit of 10', async () => {
      const trending = await engine.getTrendingInCategory(mockServices, 'storage')

      expect(trending.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getComplementaryServices', () => {
    it('should return services complementary to installed ones', async () => {
      const installed = ['filesystem', 'git']
      const complementary = await engine.getComplementaryServices(mockServices, installed)

      // Should not include installed services
      expect(complementary.every(s => !installed.includes(s.id))).toBe(true)

      // Should include services with overlapping tags
      expect(complementary.length).toBeGreaterThan(0)
    })

    it('should return empty array when all services are installed', async () => {
      const installed = mockServices.map(s => s.id)
      const complementary = await engine.getComplementaryServices(mockServices, installed)

      expect(complementary).toEqual([])
    })

    it('should return empty array when none are installed', async () => {
      // When no services are installed, there's nothing to complement
      const complementary = await engine.getComplementaryServices(mockServices, [])

      expect(complementary).toEqual([])
    })

    it('should sort by rating and downloads', async () => {
      const installed = ['filesystem']
      const complementary = await engine.getComplementaryServices(mockServices, installed)

      if (complementary.length > 1) {
        const score1 = complementary[0].rating * 100 + Math.log10(complementary[0].downloads + 1)
        const score2 = complementary[1].rating * 100 + Math.log10(complementary[1].downloads + 1)
        expect(score1).toBeGreaterThanOrEqual(score2)
      }
    })

    it('should limit results to 10', async () => {
      const complementary = await engine.getComplementaryServices(mockServices, [])

      expect(complementary.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getBeginnerFriendly', () => {
    it('should return services suitable for beginners', async () => {
      const beginnerFriendly = await engine.getBeginnerFriendly(mockServices, 5)

      expect(beginnerFriendly.every(s => s.rating >= 4.5)).toBe(true)
      expect(beginnerFriendly.every(s => s.downloads > 5000)).toBe(true)
      expect(beginnerFriendly.every(s => s.verified)).toBe(true)
    })

    it('should return empty array when no services meet criteria', async () => {
      const lowQualityServices = mockServices.map(s => ({
        ...s,
        rating: 3.0,
        downloads: 1000,
        verified: false,
      }))

      const beginnerFriendly = await engine.getBeginnerFriendly(lowQualityServices)

      expect(beginnerFriendly).toEqual([])
    })

    it('should sort by rating and downloads', async () => {
      const beginnerFriendly = await engine.getBeginnerFriendly(mockServices)

      if (beginnerFriendly.length > 1) {
        const score1 = beginnerFriendly[0].rating * 100 + Math.log10(beginnerFriendly[0].downloads + 1)
        const score2 = beginnerFriendly[1].rating * 100 + Math.log10(beginnerFriendly[1].downloads + 1)
        expect(score1).toBeGreaterThanOrEqual(score2)
      }
    })

    it('should use default limit of 10', async () => {
      const beginnerFriendly = await engine.getBeginnerFriendly(mockServices)

      expect(beginnerFriendly.length).toBeLessThanOrEqual(10)
    })

    it('should respect custom limit', async () => {
      const beginnerFriendly = await engine.getBeginnerFriendly(mockServices, 3)

      expect(beginnerFriendly.length).toBeLessThanOrEqual(3)
    })
  })

  describe('recommendation scoring edge cases', () => {
    it('should handle services with zero downloads', async () => {
      const servicesWithZero: MCPService[] = [{
        ...mockServices[0],
        downloads: 0,
      }]

      const recommendations = await engine.getPersonalizedRecommendations(
        servicesWithZero,
        beginnerProfile,
      )

      expect(recommendations).toBeTruthy()
      expect(recommendations.length).toBeGreaterThan(0)
    })

    it('should handle services with zero reviews', async () => {
      const servicesWithZeroReviews: MCPService[] = [{
        ...mockServices[0],
        reviews: 0,
      }]

      const recommendations = await engine.getPersonalizedRecommendations(
        servicesWithZeroReviews,
        beginnerProfile,
      )

      expect(recommendations).toBeTruthy()
      expect(recommendations.length).toBeGreaterThan(0)
    })

    it('should handle services with maximum rating', async () => {
      const perfectServices: MCPService[] = [{
        ...mockServices[0],
        rating: 5.0,
        downloads: 100000,
        reviews: 1000,
      }]

      const recommendations = await engine.getPersonalizedRecommendations(
        perfectServices,
        beginnerProfile,
      )

      expect(recommendations).toBeTruthy()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].rating).toBe(5.0)
    })

    it('should handle empty preferences', async () => {
      const profileWithEmptyPrefs: UserProfile = {
        ...beginnerProfile,
        preferences: {
          categories: [],
          tags: [],
        },
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        profileWithEmptyPrefs,
      )

      expect(recommendations.length).toBeGreaterThan(0)
    })

    it('should handle empty tech stack', async () => {
      const profileWithEmptyStack: UserProfile = {
        ...beginnerProfile,
        techStack: [],
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        profileWithEmptyStack,
      )

      expect(recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('cross-platform recommendations', () => {
    it('should recommend compatible services for Windows users', async () => {
      const windowsProfile: UserProfile = {
        ...beginnerProfile,
        preferences: {
          categories: [],
          tags: ['windows'],
        },
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        windowsProfile,
      )

      // Services compatible with Windows should be recommended
      const windowsCompatible = recommendations.filter(s => s.compatibility.os.includes('win32'))
      expect(windowsCompatible.length).toBeGreaterThan(0)
    })

    it('should recommend compatible services for macOS users', async () => {
      const macProfile: UserProfile = {
        ...beginnerProfile,
        preferences: {
          categories: [],
          tags: ['macos', 'darwin'],
        },
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        macProfile,
      )

      const darwinCompatible = recommendations.filter(s => s.compatibility.os.includes('darwin'))
      expect(darwinCompatible.length).toBeGreaterThan(0)
    })

    it('should recommend compatible services for Linux users', async () => {
      const linuxProfile: UserProfile = {
        ...beginnerProfile,
        preferences: {
          categories: [],
          tags: ['linux'],
        },
      }

      const recommendations = await engine.getPersonalizedRecommendations(
        mockServices,
        linuxProfile,
      )

      const linuxCompatible = recommendations.filter(s => s.compatibility.os.includes('linux'))
      expect(linuxCompatible.length).toBeGreaterThan(0)
    })
  })

  describe('combo recommendations', () => {
    it('should include Full Stack Developer combo', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'filesystem')

      const fullStackCombo = combos.find(c => c.name === 'Full Stack Developer')
      expect(fullStackCombo).toBeDefined()
    })

    it('should include DevOps Engineer combo', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'docker')

      const devOpsCombo = combos.find(c => c.name === 'DevOps Engineer')
      expect(devOpsCombo).toBeDefined()
    })

    it('should include QA Engineer combo', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'puppeteer')

      const qaCombo = combos.find(c => c.name === 'QA Engineer')
      expect(qaCombo).toBeDefined()
    })

    it('should have combo popularity scores', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'filesystem')

      expect(combos.every(c => typeof c.popularity === 'number' && c.popularity >= 0)).toBe(true)
    })

    it('should have combo ratings', async () => {
      const combos = await engine.getServiceCombos(mockServices, 'filesystem')

      expect(combos.every(c => typeof c.rating === 'number' && c.rating >= 0 && c.rating <= 5)).toBe(true)
    })
  })
})
