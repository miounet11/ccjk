/**
 * Service Bundles
 * Pre-configured bundles of MCP services for different use cases
 */

import { ServiceBundle } from '../types';

/**
 * Get all available service bundles
 */
export function getServiceBundles(): ServiceBundle[] {
  return [
    {
      id: 'starter',
      name: 'Starter Bundle',
      description: 'Essential services for getting started with MCP development',
      icon: '🚀',
      services: [
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'markdown', required: false },
      ],
      category: 'Beginner',
      downloads: 15000,
      rating: 4.8,
      featured: true,
    },
    {
      id: 'database-developer',
      name: 'Database Developer Bundle',
      description: 'Complete toolkit for database development and management',
      icon: '💾',
      services: [
        { serviceId: 'sqlite', required: true },
        { serviceId: 'postgres', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'git', required: false },
      ],
      category: 'Database',
      downloads: 12000,
      rating: 4.7,
      featured: true,
    },
    {
      id: 'cloud-developer',
      name: 'Cloud Developer Bundle',
      description: 'Essential tools for cloud-native application development',
      icon: '☁️',
      services: [
        { serviceId: 'aws', required: true },
        { serviceId: 'docker', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'github', required: false },
      ],
      category: 'Cloud',
      downloads: 10000,
      rating: 4.6,
      featured: true,
    },
    {
      id: 'testing',
      name: 'Testing Bundle',
      description: 'Automated testing and quality assurance tools',
      icon: '🧪',
      services: [
        { serviceId: 'puppeteer', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
        { serviceId: 'git', required: false },
      ],
      category: 'Testing',
      downloads: 9000,
      rating: 4.5,
      featured: true,
    },
    {
      id: 'content-creator',
      name: 'Content Creator Bundle',
      description: 'Documentation and content management tools',
      icon: '📝',
      services: [
        { serviceId: 'markdown', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'github', required: true },
        { serviceId: 'fetch', required: false },
      ],
      category: 'Documentation',
      downloads: 8000,
      rating: 4.4,
      featured: true,
    },
    {
      id: 'fullstack',
      name: 'Full Stack Bundle',
      description: 'Complete toolkit for full-stack development',
      icon: '🎯',
      services: [
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'postgres', required: true },
        { serviceId: 'github', required: false },
        { serviceId: 'docker', required: false },
      ],
      category: 'Full Stack',
      downloads: 18000,
      rating: 4.9,
      featured: true,
    },
    {
      id: 'devops',
      name: 'DevOps Bundle',
      description: 'Essential tools for DevOps workflows and automation',
      icon: '⚙️',
      services: [
        { serviceId: 'docker', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'aws', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'github', required: false },
      ],
      category: 'DevOps',
      downloads: 14000,
      rating: 4.7,
      featured: true,
    },
    {
      id: 'backend',
      name: 'Backend Developer Bundle',
      description: 'Server-side development essentials',
      icon: '🔧',
      services: [
        { serviceId: 'postgres', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
      ],
      category: 'Backend',
      downloads: 13000,
      rating: 4.6,
      featured: true,
    },
    {
      id: 'api-developer',
      name: 'API Developer Bundle',
      description: 'Tools for building and consuming APIs',
      icon: '🌐',
      services: [
        { serviceId: 'fetch', required: true },
        { serviceId: 'postgres', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'github', required: false },
      ],
      category: 'API',
      downloads: 11000,
      rating: 4.7,
      featured: true,
    },
    {
      id: 'data-engineer',
      name: 'Data Engineer Bundle',
      description: 'Data processing and storage tools',
      icon: '📊',
      services: [
        { serviceId: 'postgres', required: true },
        { serviceId: 'sqlite', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: false },
      ],
      category: 'Data',
      downloads: 9500,
      rating: 4.6,
      featured: true,
    },
    {
      id: 'minimal',
      name: 'Minimal Bundle',
      description: 'Bare minimum for basic MCP operations',
      icon: '⚡',
      services: [
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
      ],
      category: 'Minimal',
      downloads: 7000,
      rating: 4.5,
      featured: false,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Bundle',
      description: 'Production-ready enterprise toolkit',
      icon: '🏢',
      services: [
        { serviceId: 'postgres', required: true },
        { serviceId: 'docker', required: true },
        { serviceId: 'aws', required: true },
        { serviceId: 'git', required: true },
        { serviceId: 'github', required: true },
        { serviceId: 'filesystem', required: true },
        { serviceId: 'fetch', required: true },
      ],
      category: 'Enterprise',
      downloads: 16000,
      rating: 4.8,
      featured: true,
    },
  ];
}

/**
 * Get bundle by ID
 */
export function getBundleById(id: string): ServiceBundle | null {
  const bundles = getServiceBundles();
  return bundles.find((bundle) => bundle.id === id) || null;
}

/**
 * Get bundles by category
 */
export function getBundlesByCategory(category: string): ServiceBundle[] {
  const bundles = getServiceBundles();
  return bundles.filter((bundle) => bundle.category === category);
}

/**
 * Get featured bundles
 */
export function getFeaturedBundles(): ServiceBundle[] {
  const bundles = getServiceBundles();
  return bundles.filter((bundle) => bundle.featured);
}

/**
 * Get popular bundles
 */
export function getPopularBundles(limit: number = 5): ServiceBundle[] {
  const bundles = getServiceBundles();
  return bundles.sort((a, b) => b.downloads - a.downloads).slice(0, limit);
}

/**
 * Get bundle recommendations based on installed services
 */
export function getRecommendedBundles(
  installedServices: string[]
): ServiceBundle[] {
  const bundles = getServiceBundles();

  // Score bundles based on how many services are already installed
  const scored = bundles.map((bundle) => {
    const installedCount = bundle.services.filter((s) =>
      installedServices.includes(s.serviceId)
    ).length;

    const totalCount = bundle.services.length;
    const score = installedCount / totalCount;

    return { bundle, score };
  });

  // Return bundles with some services installed but not all
  return scored
    .filter((item) => item.score > 0 && item.score < 1)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.bundle);
}

/**
 * Get bundle details with descriptions
 */
export function getBundleDetails(): Record<string, string> {
  return {
    starter: `
# Starter Bundle 🚀

Perfect for developers new to MCP. This bundle includes the essential services you need to get started.

## Included Services
- **File System** - Read and write files
- **HTTP Fetch** - Make HTTP requests
- **Git** - Version control operations
- **Markdown** - Documentation processing (optional)

## Best For
- Beginners learning MCP
- Simple automation tasks
- Quick prototyping
- Learning projects

## Installation
\`\`\`bash
ccjk mcp install-bundle starter
\`\`\`
`,
    'database-developer': `
# Database Developer Bundle 💾

Complete toolkit for database development and management.

## Included Services
- **SQLite** - Lightweight database
- **PostgreSQL** - Production database
- **File System** - File operations
- **Git** - Version control (optional)

## Best For
- Database administrators
- Backend developers
- Data modeling
- Database migrations

## Installation
\`\`\`bash
ccjk mcp install-bundle database-developer
\`\`\`
`,
    'cloud-developer': `
# Cloud Developer Bundle ☁️

Essential tools for cloud-native application development.

## Included Services
- **AWS** - Amazon Web Services integration
- **Docker** - Container management
- **Git** - Version control
- **GitHub** - Repository management (optional)

## Best For
- Cloud architects
- DevOps engineers
- Microservices development
- Cloud migrations

## Installation
\`\`\`bash
ccjk mcp install-bundle cloud-developer
\`\`\`
`,
    fullstack: `
# Full Stack Bundle 🎯

Everything you need for full-stack development.

## Included Services
- **File System** - File operations
- **HTTP Fetch** - API calls
- **Git** - Version control
- **PostgreSQL** - Database
- **GitHub** - Repository management (optional)
- **Docker** - Containerization (optional)

## Best For
- Full-stack developers
- Web applications
- API development
- Complete projects

## Installation
\`\`\`bash
ccjk mcp install-bundle fullstack
\`\`\`
`,
  };
}
