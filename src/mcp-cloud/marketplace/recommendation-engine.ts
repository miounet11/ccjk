/**
 * Recommendation Engine
 * Provides intelligent service recommendations based on user profile
 */

import {
  MCPService,
  UserProfile,
  ServiceCombo,
} from '../types';

export class RecommendationEngine {
  /**
   * Analyze user profile to extract tech stack
   */
  analyzeProfile(user: UserProfile): string[] {
    return user.techStack;
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(
    services: MCPService[],
    userProfile: UserProfile,
    limit: number = 10
  ): Promise<MCPService[]> {
    // Score each service based on user profile
    const scored = services.map((service) => ({
      service,
      score: this.calculateRecommendationScore(service, userProfile),
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return top N
    return scored.slice(0, limit).map((item) => item.service);
  }

  /**
   * Calculate recommendation score for a service
   */
  private calculateRecommendationScore(
    service: MCPService,
    userProfile: UserProfile
  ): number {
    let score = 0;

    // Base score from rating and downloads
    score += service.rating * 10;
    score += Math.log10(service.downloads + 1) * 5;

    // Tech stack match
    const techStackMatch = service.tags.filter((tag) =>
      userProfile.techStack.some((tech) => tech.toLowerCase().includes(tag.toLowerCase()))
    ).length;
    score += techStackMatch * 20;

    // Category preference
    const categoryMatch = service.category.filter((cat) =>
      userProfile.preferences.categories.includes(cat)
    ).length;
    score += categoryMatch * 15;

    // Tag preference
    const tagMatch = service.tags.filter((tag) =>
      userProfile.preferences.tags.includes(tag)
    ).length;
    score += tagMatch * 10;

    // Already installed (lower priority)
    if (userProfile.installedServices.includes(service.id)) {
      score -= 50;
    }

    // Trending boost
    if (service.trending) {
      score += 15;
    }

    // Featured boost
    if (service.featured) {
      score += 10;
    }

    // Verified boost
    if (service.verified) {
      score += 5;
    }

    // Experience level adjustment
    if (userProfile.experience === 'beginner') {
      // Prefer well-documented, popular services
      if (service.downloads > 10000) score += 10;
      if (service.rating > 4.5) score += 10;
    } else if (userProfile.experience === 'advanced') {
      // Prefer cutting-edge, specialized services
      if (service.trending) score += 15;
      if (service.category.length > 2) score += 10; // Multi-category = specialized
    }

    return score;
  }

  /**
   * Get service combinations that work well together
   */
  async getServiceCombos(
    services: MCPService[],
    baseService: string
  ): Promise<ServiceCombo[]> {
    const combos: ServiceCombo[] = [];

    // Predefined popular combinations
    const popularCombos = this.getPopularCombos();

    // Find combos that include the base service
    for (const combo of popularCombos) {
      if (combo.services.includes(baseService)) {
        // Check if all services in combo exist
        const allExist = combo.services.every((serviceId) =>
          services.some((s) => s.id === serviceId)
        );

        if (allExist) {
          combos.push(combo);
        }
      }
    }

    return combos;
  }

  /**
   * Get trending services in a category
   */
  async getTrendingInCategory(
    services: MCPService[],
    category: string,
    limit: number = 10
  ): Promise<MCPService[]> {
    // Filter by category and trending
    const filtered = services.filter(
      (service) => service.category.includes(category) && service.trending
    );

    // Sort by downloads and rating
    filtered.sort((a, b) => {
      const scoreA = a.downloads * 0.7 + a.rating * 1000;
      const scoreB = b.downloads * 0.7 + b.rating * 1000;
      return scoreB - scoreA;
    });

    return filtered.slice(0, limit);
  }

  /**
   * Get complementary services
   */
  async getComplementaryServices(
    services: MCPService[],
    installedServices: string[]
  ): Promise<MCPService[]> {
    // Find services that complement installed ones
    const complementary: MCPService[] = [];

    for (const service of services) {
      // Skip if already installed
      if (installedServices.includes(service.id)) {
        continue;
      }

      // Check if service complements installed services
      const hasComplementaryTags = service.tags.some((tag) =>
        installedServices.some((installedId) => {
          const installed = services.find((s) => s.id === installedId);
          return installed && installed.tags.includes(tag);
        })
      );

      if (hasComplementaryTags) {
        complementary.push(service);
      }
    }

    // Sort by rating and downloads
    complementary.sort((a, b) => {
      const scoreA = a.rating * 100 + Math.log10(a.downloads + 1);
      const scoreB = b.rating * 100 + Math.log10(b.downloads + 1);
      return scoreB - scoreA;
    });

    return complementary.slice(0, 10);
  }

  /**
   * Get popular service combinations
   */
  private getPopularCombos(): ServiceCombo[] {
    return [
      {
        name: 'Full Stack Developer',
        description: 'Complete toolkit for full-stack development',
        services: ['filesystem', 'fetch', 'git', 'postgres', 'github'],
        useCase: 'Building and deploying full-stack applications',
        popularity: 95,
        rating: 4.8,
      },
      {
        name: 'DevOps Engineer',
        description: 'Essential tools for DevOps workflows',
        services: ['docker', 'git', 'aws', 'filesystem', 'github'],
        useCase: 'Container orchestration and cloud deployment',
        popularity: 90,
        rating: 4.7,
      },
      {
        name: 'Data Engineer',
        description: 'Data processing and storage tools',
        services: ['postgres', 'sqlite', 'filesystem', 'fetch'],
        useCase: 'Data pipelines and database management',
        popularity: 85,
        rating: 4.6,
      },
      {
        name: 'QA Engineer',
        description: 'Testing and automation tools',
        services: ['puppeteer', 'filesystem', 'fetch', 'git'],
        useCase: 'Automated testing and quality assurance',
        popularity: 80,
        rating: 4.5,
      },
      {
        name: 'Content Creator',
        description: 'Documentation and content management',
        services: ['markdown', 'filesystem', 'github', 'fetch'],
        useCase: 'Creating and managing documentation',
        popularity: 75,
        rating: 4.4,
      },
      {
        name: 'Backend Developer',
        description: 'Server-side development tools',
        services: ['postgres', 'git', 'filesystem', 'fetch'],
        useCase: 'Building robust backend services',
        popularity: 88,
        rating: 4.7,
      },
      {
        name: 'Cloud Architect',
        description: 'Cloud infrastructure management',
        services: ['aws', 'docker', 'git', 'filesystem'],
        useCase: 'Designing and managing cloud infrastructure',
        popularity: 82,
        rating: 4.6,
      },
      {
        name: 'API Developer',
        description: 'API development and integration',
        services: ['fetch', 'postgres', 'git', 'github'],
        useCase: 'Building and consuming APIs',
        popularity: 86,
        rating: 4.7,
      },
    ];
  }

  /**
   * Get services for beginners
   */
  async getBeginnerFriendly(
    services: MCPService[],
    limit: number = 10
  ): Promise<MCPService[]> {
    // Filter for high-rated, well-documented services
    const beginner = services.filter(
      (service) =>
        service.rating >= 4.5 &&
        service.downloads > 5000 &&
        service.verified
    );

    // Sort by rating and downloads
    beginner.sort((a, b) => {
      const scoreA = a.rating * 100 + Math.log10(a.downloads + 1);
      const scoreB = b.rating * 100 + Math.log10(b.downloads + 1);
      return scoreB - scoreA;
    });

    return beginner.slice(0, limit);
  }
}
