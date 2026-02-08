import type { ProjectAnalysis } from '../analyzers/types.js'
import type { HookTemplate } from '../hooks/types.js'

/**
 * Get hook recommendations from cloud service
 */
export async function getCloudRecommendedHooks(
  projectInfo: ProjectAnalysis,
  options: {
    includeCommunity?: boolean
    includePremium?: boolean
    limit?: number
  } = {},
): Promise<HookTemplate[]> {
  const { includeCommunity = true, includePremium = false, limit = 10 } = options

  try {
    // Mock cloud API call - in real implementation this would call actual cloud service
    const recommendations = await fetchCloudRecommendations(projectInfo, {
      includeCommunity,
      includePremium,
      limit,
    })

    return recommendations
  }
  catch (error) {
    console.error('Failed to fetch cloud recommendations:', error)
    // Return empty array to fallback to local templates
    return []
  }
}

/**
 * Fetch recommendations from cloud API (mock implementation)
 */
async function fetchCloudRecommendations(
  projectInfo: ProjectAnalysis,
  options: {
    includeCommunity: boolean
    includePremium: boolean
    limit: number
  },
): Promise<HookTemplate[]> {
  // Mock cloud recommendations based on project analysis
  const recommendations: HookTemplate[] = []

  // Get base recommendations based on project type
  const baseRecommendations = getBaseRecommendations(projectInfo)
  recommendations.push(...baseRecommendations)

  // Add framework-specific recommendations
  if (projectInfo.frameworks?.length > 0) {
    const frameworkRecs = getFrameworkRecommendations(projectInfo)
    recommendations.push(...frameworkRecs)
  }

  // Add tool-specific recommendations
  if (projectInfo.configFiles?.length > 0) {
    const toolRecs = getToolRecommendations(projectInfo)
    recommendations.push(...toolRecs)
  }

  // Filter based on options
  let filtered = recommendations

  if (!options.includeCommunity) {
    filtered = filtered.filter(r => r.metadata?.tags?.includes('official'))
  }

  if (!options.includePremium) {
    filtered = filtered.filter(r => !r.metadata?.tags?.includes('premium'))
  }

  // Limit results
  if (options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  // Sort by priority
  filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0))

  return filtered
}

/**
 * Get base recommendations based on project type
 */
function getBaseRecommendations(projectInfo: ProjectAnalysis): HookTemplate[] {
  const recommendations: HookTemplate[] = []
  const projectType = projectInfo.projectType.toLowerCase()

  // TypeScript/JavaScript base recommendations
  if (projectType.includes('typescript') || projectType.includes('javascript')) {
    recommendations.push(
      {
        name: 'cloud-pre-commit-security',
        description: 'Advanced security scanning (Cloud)',
        type: 'pre-commit',
        category: 'pre-commit',
        projectTypes: ['typescript', 'javascript'],
        trigger: {
          matcher: 'git:pre-commit',
        },
        action: {
          command: 'ccjk-cloud',
          args: ['scan', 'security', '--staged'],
          timeout: 60000,
        },
        enabled: true,
        priority: 200,
        metadata: {
          tags: ['official', 'security', 'cloud'],
          version: '1.0.0',
        },
      },
      {
        name: 'cloud-dependency-check',
        description: 'Check for vulnerable dependencies',
        type: 'pre-commit',
        category: 'pre-commit',
        projectTypes: ['typescript', 'javascript'],
        trigger: {
          matcher: 'git:pre-commit',
          condition: 'package-lock.json || yarn.lock || pnpm-lock.yaml',
        },
        action: {
          command: 'ccjk-cloud',
          args: ['audit', 'dependencies'],
          timeout: 30000,
        },
        enabled: true,
        priority: 190,
        metadata: {
          tags: ['official', 'security', 'cloud'],
          version: '1.0.0',
        },
      },
    )
  }

  // Python base recommendations
  if (projectType.includes('python')) {
    recommendations.push(
      {
        name: 'cloud-python-security',
        description: 'Python security analysis',
        type: 'pre-commit',
        category: 'pre-commit',
        projectTypes: ['python'],
        trigger: {
          matcher: 'git:pre-commit',
        },
        action: {
          command: 'ccjk-cloud',
          args: ['scan', 'python-security'],
          timeout: 45000,
        },
        enabled: true,
        priority: 200,
        metadata: {
          tags: ['official', 'security', 'cloud'],
          version: '1.0.0',
        },
      },
    )
  }

  // Rust base recommendations
  if (projectType.includes('rust')) {
    recommendations.push(
      {
        name: 'cloud-rust-audit',
        description: 'Audit Rust dependencies for vulnerabilities',
        type: 'pre-commit',
        category: 'pre-commit',
        projectTypes: ['rust'],
        trigger: {
          matcher: 'git:pre-commit',
          condition: 'Cargo.lock',
        },
        action: {
          command: 'ccjk-cloud',
          args: ['audit', 'cargo'],
          timeout: 30000,
        },
        enabled: true,
        priority: 200,
        metadata: {
          tags: ['official', 'security', 'cloud'],
          version: '1.0.0',
        },
      },
    )
  }

  return recommendations
}

/**
 * Get framework-specific recommendations
 */
function getFrameworkRecommendations(projectInfo: ProjectAnalysis): HookTemplate[] {
  const recommendations: HookTemplate[] = []

  for (const framework of projectInfo.frameworks) {
    const frameworkName = framework.name.toLowerCase()

    // React recommendations
    if (frameworkName.includes('react')) {
      recommendations.push(
        {
          name: 'cloud-react-performance',
          description: 'Analyze React bundle performance',
          type: 'post-build',
          category: 'lifecycle',
          projectTypes: ['typescript', 'javascript'],
          trigger: {
            matcher: 'command:*build*',
          },
          action: {
            command: 'ccjk-cloud',
            args: ['analyze', 'react-bundle'],
            timeout: 30000,
          },
          enabled: true,
          priority: 150,
          metadata: {
            tags: ['official', 'react', 'performance', 'cloud'],
            version: '1.0.0',
          },
        },
      )
    }

    // Vue recommendations
    if (frameworkName.includes('vue')) {
      recommendations.push(
        {
          name: 'cloud-vue-analysis',
          description: 'Vue specific code analysis',
          type: 'pre-commit',
          category: 'pre-commit',
          projectTypes: ['typescript', 'javascript'],
          trigger: {
            matcher: 'git:pre-commit',
          },
          action: {
            command: 'ccjk-cloud',
            args: ['analyze', 'vue'],
            timeout: 20000,
          },
          enabled: true,
          priority: 150,
          metadata: {
            tags: ['official', 'vue', 'cloud'],
            version: '1.0.0',
          },
        },
      )
    }

    // Django recommendations
    if (frameworkName.includes('django')) {
      recommendations.push(
        {
          name: 'cloud-django-checks',
          description: 'Run Django system checks',
          type: 'pre-commit',
          category: 'pre-commit',
          projectTypes: ['python'],
          trigger: {
            matcher: 'git:pre-commit',
            condition: '*.py',
          },
          action: {
            command: 'ccjk-cloud',
            args: ['django', 'checks'],
            timeout: 15000,
          },
          enabled: true,
          priority: 150,
          metadata: {
            tags: ['official', 'django', 'cloud'],
            version: '1.0.0',
          },
        },
      )
    }
  }

  return recommendations
}

/**
 * Get tool-specific recommendations
 */
function getToolRecommendations(projectInfo: ProjectAnalysis): HookTemplate[] {
  const recommendations: HookTemplate[] = []
  const configFiles = projectInfo.configFiles || []

  // ESLint recommendations
  if (configFiles.some(f => f.includes('eslint'))) {
    recommendations.push({
      name: 'cloud-eslint-advanced',
      description: 'Advanced ESLint analysis with custom rules',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'git:pre-commit',
      },
      action: {
        command: 'ccjk-cloud',
        args: ['lint', 'eslint', '--advanced'],
        timeout: 25000,
      },
      enabled: true,
      priority: 140,
      metadata: {
        tags: ['official', 'eslint', 'cloud'],
        version: '1.0.0',
      },
    })
  }

  // Testing framework recommendations
  if (configFiles.some(f => f.includes('jest') || f.includes('vitest') || f.includes('mocha'))) {
    recommendations.push({
      name: 'cloud-test-intelligence',
      description: 'Smart test execution based on changes',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'git:pre-commit',
      },
      action: {
        command: 'ccjk-cloud',
        args: ['test', 'intelligent'],
        timeout: 120000,
      },
      enabled: true,
      priority: 160,
      metadata: {
        tags: ['official', 'testing', 'cloud', 'intelligent'],
        version: '1.0.0',
      },
    })
  }

  return recommendations
}

/**
 * Submit hook usage analytics
 */
export async function submitHookAnalytics(
  hookName: string,
  projectInfo: ProjectAnalysis,
  result: 'installed' | 'skipped' | 'error',
): Promise<void> {
  try {
    // Mock analytics submission
    console.log(`Analytics: Hook ${hookName} ${result} for ${projectInfo.projectType} project`)
    // In real implementation, this would send to analytics service
  }
  catch (_error) {
    // Fail silently for analytics
  }
}

/**
 * Get popular hooks from community
 */
export async function getCommunityHooks(
  limit: number = 10,
  category?: string,
): Promise<HookTemplate[]> {
  // Mock community hooks
  const communityHooks: HookTemplate[] = [
    {
      name: 'community-commit-emoji',
      description: 'Add emoji to commit messages based on changes',
      type: 'post-commit',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript', 'python'],
      trigger: {
        matcher: 'git:post-commit',
      },
      action: {
        command: 'ccjk-community',
        args: ['commit-emoji'],
        timeout: 5000,
      },
      enabled: true,
      priority: 100,
      metadata: {
        tags: ['community', 'git', 'fun'],
        author: 'ccjk-user-123',
        version: '1.0.0',
      },
    },
    {
      name: 'community-code-poetry',
      description: 'Generate poetry from your code',
      type: 'post-commit',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript', 'python'],
      trigger: {
        matcher: 'git:post-commit',
      },
      action: {
        command: 'ccjk-community',
        args: ['code-poetry'],
        timeout: 10000,
      },
      enabled: false,
      priority: 50,
      metadata: {
        tags: ['community', 'fun', 'ai'],
        author: 'poet-coder',
        version: '1.0.0',
      },
    },
  ]

  let filtered = communityHooks

  if (category) {
    filtered = filtered.filter(h => h.category === category)
  }

  return filtered.slice(0, limit)
}
