import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSupportedPackages,
  getVersionFromGitHub,
  isGitHubVersionSupported,
} from '../../../src/utils/registry/github-version'

// Mock fetch globally
globalThis.fetch = vi.fn()

describe('github-version', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isGitHubVersionSupported', () => {
    it('should return true for supported packages', () => {
      expect(isGitHubVersionSupported('@anthropic-ai/claude-code')).toBe(true)
      expect(isGitHubVersionSupported('@musistudio/claude-code-router')).toBe(true)
      expect(isGitHubVersionSupported('@cometix/ccline')).toBe(true)
    })

    it('should return false for unsupported packages', () => {
      expect(isGitHubVersionSupported('@unknown/package')).toBe(false)
      expect(isGitHubVersionSupported('random-package')).toBe(false)
      expect(isGitHubVersionSupported('')).toBe(false)
    })
  })

  describe('getSupportedPackages', () => {
    it('should return all supported package names', () => {
      const packages = getSupportedPackages()
      expect(packages).toContain('@anthropic-ai/claude-code')
      expect(packages).toContain('@musistudio/claude-code-router')
      expect(packages).toContain('@cometix/ccline')
      expect(packages.length).toBe(3)
    })
  })

  describe('getVersionFromGitHub', () => {
    it('should fetch and return version for supported package', async () => {
      const mockRelease = {
        tag_name: 'v1.2.3',
        name: 'Release 1.2.3',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBe('1.2.3')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/anthropics/claude-code/releases/latest',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'ccjk-cli',
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        }),
      )
    })

    it('should handle version tags without v prefix', async () => {
      const mockRelease = {
        tag_name: '2.0.0',
        name: 'Release 2.0.0',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@musistudio/claude-code-router')
      expect(version).toBe('2.0.0')
    })

    it('should handle version tags with release- prefix', async () => {
      const mockRelease = {
        tag_name: 'release-3.1.4',
        name: 'Release 3.1.4',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@cometix/ccline')
      expect(version).toBe('3.1.4')
    })

    it('should return null for unsupported package', async () => {
      const version = await getVersionFromGitHub('@unknown/package')
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should return null when rate limited', async () => {
      const headers = new Headers()
      headers.set('X-RateLimit-Remaining', '0')

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers,
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should return null for non-OK responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should return null for draft releases', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0-draft',
        name: 'Draft Release',
        prerelease: false,
        draft: true,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should return null for prerelease versions', async () => {
      const mockRelease = {
        tag_name: 'v2.0.0-beta.1',
        name: 'Beta Release',
        prerelease: true,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle timeout gracefully', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code', 50)
      expect(version).toBeNull()
    })

    it('should respect custom timeout parameter', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockImplementationOnce((_url, options) => {
        // Verify AbortController is set up
        expect(options?.signal).toBeDefined()
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockRelease,
          headers: new Headers(),
        } as Response)
      })

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code', 5000)
      expect(version).toBe('1.0.0')
    })

    it('should handle JSON parsing errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
        headers: new Headers(),
      } as unknown as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle malformed release data', async () => {
      const mockRelease = {
        // Missing tag_name
        name: 'Release',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      // Should handle gracefully, might return undefined or throw
      expect(version === null || version === undefined).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple sequential requests', async () => {
      const mockRelease1 = {
        tag_name: 'v1.0.0',
        name: 'Release 1',
        prerelease: false,
        draft: false,
      }

      const mockRelease2 = {
        tag_name: 'v2.0.0',
        name: 'Release 2',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockRelease1,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockRelease2,
          headers: new Headers(),
        } as Response)

      const version1 = await getVersionFromGitHub('@anthropic-ai/claude-code')
      const version2 = await getVersionFromGitHub('@musistudio/claude-code-router')

      expect(version1).toBe('1.0.0')
      expect(version2).toBe('2.0.0')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed success and failure scenarios', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockRelease,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers(),
        } as Response)

      const version1 = await getVersionFromGitHub('@anthropic-ai/claude-code')
      const version2 = await getVersionFromGitHub('@musistudio/claude-code-router')

      expect(version1).toBe('1.0.0')
      expect(version2).toBeNull()
    })
  })
})
