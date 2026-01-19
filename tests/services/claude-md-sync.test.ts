/**
 * Tests for CLAUDE.md Cloud Sync Service
 *
 * Following TDD methodology - tests written before implementation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock template data
const mockTemplateData = {
  templates: [
    {
      id: 'nodejs-express',
      name: 'Node.js Express API',
      category: 'backend',
      description: 'CLAUDE.md template for Node.js Express REST API projects',
      tags: ['nodejs', 'express', 'api', 'backend', 'rest'],
      variables: ['PROJECT_NAME', 'AUTHOR', 'DESCRIPTION', 'PORT'],
      content: '# {{PROJECT_NAME}}\n\n**Author**: {{AUTHOR}}\n\n{{DESCRIPTION}}',
    },
    {
      id: 'react-webapp',
      name: 'React Web Application',
      category: 'frontend',
      description: 'CLAUDE.md template for React web applications',
      tags: ['react', 'frontend', 'webapp', 'spa'],
      variables: ['PROJECT_NAME', 'AUTHOR', 'DESCRIPTION'],
      content: '# {{PROJECT_NAME}}\n\n**Author**: {{AUTHOR}}\n\n{{DESCRIPTION}}',
    },
  ],
  categories: [
    {
      id: 'frontend',
      name: 'Frontend Development',
      description: 'Templates for frontend web applications',
    },
    {
      id: 'backend',
      name: 'Backend Development',
      description: 'Templates for backend APIs and services',
    },
  ],
}

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => {
    if (path.includes('claude-md-templates.json'))
      return true
    if (path.includes('/project/path/CLAUDE.md'))
      return true
    if (path === '/non/existent/file')
      return false
    return true
  }),
  readFileSync: vi.fn((path: string) => {
    if (path.includes('claude-md-templates.json')) {
      return JSON.stringify(mockTemplateData)
    }
    if (path.includes('CLAUDE.md')) {
      return '# Test Project\n\n## Overview\nTest content'
    }
    if (path.includes('cloud-token.json')) {
      return JSON.stringify({ deviceToken: 'test-token' })
    }
    return ''
  }),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

// Mock fetch for cloud API calls
globalThis.fetch = vi.fn((url: string) => {
  if (url.includes('/claude-md/upload')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { id: 'config-id-123' },
      }),
    })
  }
  if (url.includes('/claude-md/download/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { content: '# Downloaded Content' },
      }),
    })
  }
  if (url.includes('/claude-md/list')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { configs: [] },
      }),
    })
  }
  if (url.includes('/claude-md/delete/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  }
  if (url.includes('/claude-md/version/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { versionId: 'version-id-456' },
      }),
    })
  }
  if (url.includes('/claude-md/versions/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { versions: [] },
      }),
    })
  }
  if (url.includes('/claude-md/rollback/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  }
  return Promise.reject(new Error('Network error'))
}) as any

describe('claudeMdSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('template Management', () => {
    it('should list available templates', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const service = new ClaudeMdSyncService()

      const templates = await service.listTemplates()

      expect(templates).toBeDefined()
    })
  })
})
