/**
 * CCJK Skills V2 - Router System
 *
 * Routes queries to appropriate skills using keyword matching,
 * confidence scoring, and dual-skill loading.
 */

import {
  Skill,
  RouterMatch,
  RouterConfig,
  Layer,
  SkillLoadOptions,
} from './types.js';

/**
 * Router for skill selection and matching
 */
export class Router {
  private skills: Map<string, Skill> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      minConfidence: 0.25, // Reduced for better sensitivity
      maxResults: 2,
      keywordWeights: {
        exact: 1.0,
        partial: 0.6,
        related: 0.3,
      },
      layerWeights: {
        [Layer.L1]: 0.2,
        [Layer.L2]: 0.4,
        [Layer.L3]: 0.4,
      },
      ...config,
    };
  }

  /**
   * Register a skill with the router
   */
  register(skill: Skill): void {
    const id = skill.metadata.id;
    this.skills.set(id, skill);

    // Index keywords
    this.indexKeywords(id, skill);
  }

  /**
   * Find matching skills for a query
   */
  findMatches(query: string): RouterMatch[] {
    const matches: RouterMatch[] = [];
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);

    // Check each skill for matches
    for (const [id, skill] of this.skills.entries()) {
      const keywords = this.extractKeywords(skill);
      const matchedKeywords = this.matchKeywords(queryTokens, keywords);
      const score = this.calculateScore(matchedKeywords, skill);
      const confidence = this.calculateConfidence(score, matchedKeywords, keywords.length);

      if (confidence >= this.config.minConfidence) {
        matches.push({
          skill,
          score,
          keywords: matchedKeywords,
          confidence,
        });
      }
    }

    // Sort by confidence and return top results
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxResults);
  }

  /**
   * Load dual skills for multi-layered approach
   */
  loadDualSkills(options: SkillLoadOptions = {}): [Skill | null, Skill | null] {
    const { layer, tags, priority } = options;

    // Find primary skill
    let primarySkill: Skill | null = null;
    let secondarySkill: Skill | null = null;

    if (layer) {
      // Load skills for specific layers
      primarySkill = this.findSkillByLayer(layer, tags, priority);
      secondarySkill = this.findSkillByLayer(
        this.getComplementaryLayer(layer),
        tags,
        priority
      );

      // Fallback: if no skills found for specific layers, use top priority skills
      if (!primarySkill && !secondarySkill) {
        const prioritizedSkills = Array.from(this.skills.values())
          .sort((a, b) => b.metadata.priority - a.metadata.priority);

        primarySkill = prioritizedSkills[0] || null;
        secondarySkill = prioritizedSkills[1] || null;
      }
    } else if (tags && tags.length > 0) {
      // Load skills by tags
      const matchingSkills = this.findSkillsByTags(tags);
      primarySkill = matchingSkills[0] || null;
      secondarySkill = matchingSkills[1] || null;
    } else {
      // Load top priority skills
      const prioritizedSkills = Array.from(this.skills.values())
        .sort((a, b) => b.metadata.priority - a.metadata.priority);

      primarySkill = prioritizedSkills[0] || null;
      secondarySkill = prioritizedSkills[1] || null;
    }

    return [primarySkill, secondarySkill];
  }

  /**
   * Get all registered skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Remove skill from router
   */
  unregister(id: string): boolean {
    // Remove from keyword index
    const keywords = Array.from(this.keywordIndex.keys());
    for (const keyword of keywords) {
      const skillIds = this.keywordIndex.get(keyword);
      if (skillIds) {
        skillIds.delete(id);
        if (skillIds.size === 0) {
          this.keywordIndex.delete(keyword);
        }
      }
    }

    return this.skills.delete(id);
  }

  /**
   * Clear all skills
   */
  clear(): void {
    this.skills.clear();
    this.keywordIndex.clear();
  }

  /**
   * Index skill keywords for fast lookup
   */
  private indexKeywords(id: string, skill: Skill): void {
    const keywords = this.extractKeywords(skill);

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (!this.keywordIndex.has(normalizedKeyword)) {
        this.keywordIndex.set(normalizedKeyword, new Set());
      }
      this.keywordIndex.get(normalizedKeyword)!.add(id);
    }
  }

  /**
   * Extract keywords from skill metadata and protocol
   */
  private extractKeywords(skill: Skill): string[] {
    const keywords: string[] = [];

    // Add tags
    keywords.push(...skill.metadata.tags);

    // Add words from name
    const nameWords = this.tokenize(skill.metadata.name);
    keywords.push(...nameWords);

    // Add words from description
    const descWords = this.tokenize(skill.metadata.description);
    keywords.push(...descWords);

    // Add words from core question
    const questionWords = this.tokenize(skill.protocol.coreQuestion);
    keywords.push(...questionWords);

    // Add quick reference keys
    const refKeys = Object.keys(skill.protocol.quickReference || {});
    keywords.push(...refKeys);

    // Filter out common/stop words and remove duplicates
    const stopWords = new Set([
      'for', 'the', 'and', 'but', 'or', 'not', 'with', 'this', 'that',
      'these', 'those', 'from', 'have', 'been', 'were', 'was', 'are',
      'is', 'am', 'can', 'could', 'should', 'would', 'will', 'into',
      'over', 'after', 'before', 'between', 'under', 'again', 'same'
    ]);

    return Array.from(new Set(keywords)).filter(k => !stopWords.has(k.toLowerCase()));
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter short words
  }

  /**
   * Match query tokens against keywords
   */
  private matchKeywords(queryTokens: string[], keywords: string[]): string[] {
    const matched: string[] = [];

    for (const token of queryTokens) {
      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase();

        // Exact match
        if (token === normalizedKeyword) {
          matched.push(keyword);
        }
        // Partial match
        else if (
          normalizedKeyword.includes(token) ||
          token.includes(normalizedKeyword)
        ) {
          matched.push(keyword);
        }
      }
    }

    return Array.from(new Set(matched));
  }

  /**
   * Calculate match score based on keywords and weights
   */
  private calculateScore(matchedKeywords: string[], skill: Skill): number {
    let score = 0;

    for (const keyword of matchedKeywords) {
      const normalizedKeyword = keyword.toLowerCase();

      // Check if it's an exact match
      if (
        skill.metadata.tags.some(t => t.toLowerCase() === normalizedKeyword) ||
        skill.metadata.name.toLowerCase().includes(normalizedKeyword)
      ) {
        score += this.config.keywordWeights.exact;
      }
      // Check partial match
      else if (
        skill.metadata.description.toLowerCase().includes(normalizedKeyword) ||
        skill.protocol.coreQuestion.toLowerCase().includes(normalizedKeyword)
      ) {
        score += this.config.keywordWeights.partial;
      }
      // Related match
      else {
        score += this.config.keywordWeights.related;
      }
    }

    // Apply layer weight
    score *= this.config.layerWeights[skill.metadata.layer];

    // Apply priority boost
    score *= (1 + skill.metadata.priority / 100);

    return score;
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidence(
    score: number,
    matchedKeywords: string[],
    totalKeywords: number
  ): number {
    if (totalKeywords === 0) return 0;

    const matchRatio = matchedKeywords.length / totalKeywords;
    // Normalize score to 0-1 range (divide by 5 instead of 10 for better sensitivity)
    const normalizedScore = Math.min(score / 5, 1);

    // Weight: 70% match ratio, 30% score
    return (matchRatio * 0.7 + normalizedScore * 0.3);
  }

  /**
   * Find skill by layer
   */
  private findSkillByLayer(
    layer: Layer,
    tags?: string[],
    priority?: number
  ): Skill | null {
    const candidates: Skill[] = [];

    for (const skill of this.skills.values()) {
      if (skill.metadata.layer !== layer) continue;

      if (tags && tags.length > 0) {
        const hasTag = tags.some(tag => skill.metadata.tags.includes(tag));
        if (!hasTag) continue;
      }

      if (priority !== undefined && skill.metadata.priority < priority) {
        continue;
      }

      candidates.push(skill);
    }

    // Sort by priority and return top match
    candidates.sort((a, b) => b.metadata.priority - a.metadata.priority);
    return candidates[0] || null;
  }

  /**
   * Find skills by tags
   */
  private findSkillsByTags(tags: string[]): Skill[] {
    const matched: Skill[] = [];

    for (const skill of this.skills.values()) {
      const hasAllTags = tags.every(tag => skill.metadata.tags.includes(tag));
      if (hasAllTags) {
        matched.push(skill);
      }
    }

    return matched.sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * Get complementary layer for dual-skill loading
   */
  private getComplementaryLayer(layer: Layer): Layer {
    switch (layer) {
      case Layer.L1:
        return Layer.L2; // L1 + L2 for syntax + patterns
      case Layer.L2:
        return Layer.L3; // L2 + L3 for patterns + constraints
      case Layer.L3:
        return Layer.L1; // L3 + L1 for constraints + syntax
      default:
        return Layer.L2;
    }
  }
}

/**
 * Create a router instance with default configuration
 */
export function createRouter(config?: Partial<RouterConfig>): Router {
  return new Router(config);
}

/**
 * Example usage:
 *
 * ```typescript
 * // Create router
 * const router = createRouter({
 *   minConfidence: 0.6,
 *   maxResults: 2,
 * });
 *
 * // Register skills
 * router.register(errorHandlingSkill);
 * router.register(asyncPatternSkill);
 *
 * const matches = router.findMatches("How to handle async errors?");
 * console.log(matches[0].skill.metadata.name); // "Error Handling"
 *
 * // Load dual skills
 * const [primary, secondary] = router.loadDualSkills({
 *   layer: Layer.L2,
 *   tags: ['async', 'error-handling'],
 * });
 * ```
 */