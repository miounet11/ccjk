/**
 * Top 10 Recommended MCP Services
 * Curated list of the best MCP services for developers
 */

import type { MCPService } from '../types'

/**
 * Get the top 10 recommended MCP services
 */
export function getTop10Services(): MCPService[] {
  return [
    {
      id: 'filesystem',
      name: 'File System',
      package: '@modelcontextprotocol/server-filesystem',
      version: '2.1.0',
      description: 'Complete file system access with read, write, and directory operations. Essential for any file manipulation tasks.',
      category: ['File System', 'Core', 'Essential'],
      tags: ['files', 'directories', 'io', 'storage', 'essential'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 50000,
      rating: 4.9,
      reviews: 1250,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-filesystem',
        config: {
          allowedDirectories: ['~/projects', '~/documents'],
          readOnly: false,
        },
      },
      examples: [
        'Read file contents',
        'Write to files',
        'List directory contents',
        'Create/delete files and directories',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/filesystem',
      lastUpdated: '2026-01-15T00:00:00Z',
      verified: true,
    },
    {
      id: 'fetch',
      name: 'HTTP Fetch',
      package: '@modelcontextprotocol/server-fetch',
      version: '1.5.0',
      description: 'HTTP client for making requests, web scraping, and API integration. Supports all HTTP methods and advanced features.',
      category: ['Network', 'HTTP', 'Essential'],
      tags: ['http', 'api', 'web', 'scraping', 'requests'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 45000,
      rating: 4.8,
      reviews: 980,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-fetch',
        config: {
          timeout: 30000,
          maxRedirects: 5,
        },
      },
      examples: [
        'GET/POST/PUT/DELETE requests',
        'Custom headers and authentication',
        'Download files',
        'Web scraping',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/fetch',
      lastUpdated: '2026-01-10T00:00:00Z',
      verified: true,
    },
    {
      id: 'sqlite',
      name: 'SQLite Database',
      package: '@modelcontextprotocol/server-sqlite',
      version: '1.8.0',
      description: 'SQLite database access for local data storage and queries. Perfect for lightweight applications and prototyping.',
      category: ['Database', 'Storage', 'Essential'],
      tags: ['database', 'sql', 'sqlite', 'storage', 'queries'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 38000,
      rating: 4.7,
      reviews: 850,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-sqlite',
        config: {
          databases: ['~/data/app.db'],
          readOnly: false,
        },
      },
      examples: [
        'Execute SQL queries',
        'Create tables and indexes',
        'Insert/update/delete data',
        'Transactions',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/sqlite',
      lastUpdated: '2026-01-12T00:00:00Z',
      verified: true,
    },
    {
      id: 'git',
      name: 'Git Operations',
      package: '@modelcontextprotocol/server-git',
      version: '2.0.0',
      description: 'Complete Git integration for version control. Commit, push, pull, branch, and more from your MCP tools.',
      category: ['Version Control', 'Git', 'Essential'],
      tags: ['git', 'version-control', 'commit', 'push', 'pull'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 42000,
      rating: 4.8,
      reviews: 1100,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-git',
        config: {
          allowedRepos: ['~/projects'],
        },
      },
      examples: [
        'Commit changes',
        'Push/pull from remote',
        'Create branches',
        'View history and diffs',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/git',
      lastUpdated: '2026-01-14T00:00:00Z',
      verified: true,
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      package: '@modelcontextprotocol/server-postgres',
      version: '1.6.0',
      description: 'PostgreSQL database access for production applications. Advanced queries, transactions, and full SQL support.',
      category: ['Database', 'PostgreSQL', 'Production'],
      tags: ['database', 'postgresql', 'sql', 'production', 'enterprise'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 35000,
      rating: 4.7,
      reviews: 780,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-postgres',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'mydb',
        },
      },
      examples: [
        'Complex SQL queries',
        'Transactions and rollbacks',
        'Stored procedures',
        'Connection pooling',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/postgres',
      lastUpdated: '2026-01-11T00:00:00Z',
      verified: true,
    },
    {
      id: 'docker',
      name: 'Docker',
      package: '@modelcontextprotocol/server-docker',
      version: '1.4.0',
      description: 'Docker container management. Build, run, stop containers, manage images, and orchestrate multi-container apps.',
      category: ['DevOps', 'Containers', 'Docker'],
      tags: ['docker', 'containers', 'devops', 'orchestration', 'images'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 32000,
      rating: 4.6,
      reviews: 720,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-docker',
        config: {
          socketPath: '/var/run/docker.sock',
        },
      },
      examples: [
        'Build Docker images',
        'Run containers',
        'Manage volumes and networks',
        'Docker Compose integration',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/docker',
      lastUpdated: '2026-01-09T00:00:00Z',
      verified: true,
    },
    {
      id: 'aws',
      name: 'AWS Services',
      package: '@modelcontextprotocol/server-aws',
      version: '1.3.0',
      description: 'AWS cloud services integration. Access S3, Lambda, EC2, and more. Essential for cloud-native applications.',
      category: ['Cloud', 'AWS', 'Infrastructure'],
      tags: ['aws', 'cloud', 's3', 'lambda', 'ec2'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 28000,
      rating: 4.5,
      reviews: 650,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-aws',
        config: {
          region: 'us-east-1',
          credentials: 'default',
        },
      },
      examples: [
        'S3 bucket operations',
        'Lambda function management',
        'EC2 instance control',
        'CloudWatch logs',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/aws',
      lastUpdated: '2026-01-08T00:00:00Z',
      verified: true,
    },
    {
      id: 'github',
      name: 'GitHub',
      package: '@modelcontextprotocol/server-github',
      version: '1.7.0',
      description: 'GitHub API integration. Manage repositories, issues, pull requests, and more. Perfect for open source workflows.',
      category: ['Version Control', 'GitHub', 'Collaboration'],
      tags: ['github', 'git', 'issues', 'pull-requests', 'repositories'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 40000,
      rating: 4.8,
      reviews: 950,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-github',
        config: {
          token: 'ghp_...',
        },
      },
      examples: [
        'Create/manage repositories',
        'Issues and pull requests',
        'Code search',
        'GitHub Actions',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/github',
      lastUpdated: '2026-01-13T00:00:00Z',
      verified: true,
    },
    {
      id: 'markdown',
      name: 'Markdown',
      package: '@modelcontextprotocol/server-markdown',
      version: '1.2.0',
      description: 'Markdown processing and documentation generation. Parse, render, and transform markdown content with ease.',
      category: ['Documentation', 'Content', 'Markdown'],
      tags: ['markdown', 'documentation', 'content', 'parsing', 'rendering'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 25000,
      rating: 4.6,
      reviews: 580,
      trending: false,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-markdown',
        config: {
          extensions: ['gfm', 'tables', 'footnotes'],
        },
      },
      examples: [
        'Parse markdown to HTML',
        'Generate documentation',
        'Markdown linting',
        'Table of contents generation',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/markdown',
      lastUpdated: '2026-01-07T00:00:00Z',
      verified: true,
    },
    {
      id: 'puppeteer',
      name: 'Puppeteer',
      package: '@modelcontextprotocol/server-puppeteer',
      version: '1.9.0',
      description: 'Browser automation and testing. Control Chrome/Chromium, take screenshots, generate PDFs, and automate web tasks.',
      category: ['Testing', 'Automation', 'Browser'],
      tags: ['puppeteer', 'browser', 'automation', 'testing', 'screenshots'],
      author: 'Model Context Protocol',
      homepage: 'https://github.com/modelcontextprotocol/servers',
      repository: 'https://github.com/modelcontextprotocol/servers',
      license: 'MIT',
      downloads: 30000,
      rating: 4.7,
      reviews: 700,
      trending: true,
      featured: true,
      dependencies: [],
      compatibility: {
        node: '>=16.0.0',
        os: ['linux', 'darwin', 'win32'],
      },
      installation: {
        command: 'npm install -g @modelcontextprotocol/server-puppeteer',
        config: {
          headless: true,
          defaultViewport: { width: 1920, height: 1080 },
        },
      },
      examples: [
        'Automated testing',
        'Screenshot capture',
        'PDF generation',
        'Web scraping',
      ],
      documentation: 'https://modelcontextprotocol.io/docs/puppeteer',
      lastUpdated: '2026-01-16T00:00:00Z',
      verified: true,
    },
  ]
}

/**
 * Get detailed information about each service
 */
export function getServiceDetails(): Record<string, string> {
  return {
    filesystem: `
# File System MCP Service

## Overview
The File System service provides complete access to the local file system, enabling read, write, and directory operations. It's an essential service for any application that needs to manipulate files.

## Key Features
- Read and write files
- Create and delete directories
- List directory contents
- File metadata access
- Path resolution
- Symbolic link support

## Use Cases
- Configuration file management
- Log file processing
- Data import/export
- File-based caching
- Project scaffolding

## Installation
\`\`\`bash
npm install -g @modelcontextprotocol/server-filesystem
\`\`\`

## Configuration
\`\`\`json
{
  "allowedDirectories": ["~/projects", "~/documents"],
  "readOnly": false,
  "maxFileSize": "10MB"
}
\`\`\`

## Pros
✅ Essential for file operations
✅ Well-documented
✅ High performance
✅ Cross-platform

## Cons
❌ Requires careful permission management
❌ Security considerations for production
`,
    fetch: `
# HTTP Fetch MCP Service

## Overview
The Fetch service provides a powerful HTTP client for making requests, web scraping, and API integration. It supports all HTTP methods and advanced features like custom headers and authentication.

## Key Features
- All HTTP methods (GET, POST, PUT, DELETE, etc.)
- Custom headers and authentication
- File downloads
- Timeout and retry logic
- Proxy support
- Cookie management

## Use Cases
- API integration
- Web scraping
- Data fetching
- Webhook handling
- External service communication

## Installation
\`\`\`bash
npm install -g @modelcontextprotocol/server-fetch
\`\`\`

## Configuration
\`\`\`json
{
  "timeout": 30000,
  "maxRedirects": 5,
  "userAgent": "MCP-Fetch/1.5.0"
}
\`\`\`

## Pros
✅ Comprehensive HTTP support
✅ Easy to use
✅ Reliable
✅ Well-maintained

## Cons
❌ Network dependency
❌ Rate limiting considerations
`,
    // Add more detailed descriptions for other services...
  }
}
