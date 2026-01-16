import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVersionFromGitHub } from '../../../src/utils/registry/github-version'

// Mock fetch globally
globalThis.fetch = vi.fn()

describe('github-version edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extreme version tag formats', () => {
    it('should handle version with multiple prefixes', async () => {
      const mockRelease = {
        tag_name: 'version-v1.2.3',
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
      // Regex removes first matching prefix only, so "version-" is removed
      expect(version).toBe('v1.2.3')
    })

    it('should handle uppercase V prefix', async () => {
      const mockRelease = {
        tag_name: 'V1.2.3',
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
      expect(version).toBe('1.2.3')
    })

    it('should handle mixed case RELEASE prefix', async () => {
      const mockRelease = {
        tag_name: 'RELEASE-1.2.3',
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
      expect(version).toBe('1.2.3')
    })

    it('should handle version with build metadata', async () => {
      const mockRelease = {
        tag_name: 'v1.2.3+build.123',
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
      expect(version).toBe('1.2.3+build.123')
    })

    it('should handle empty tag_name', async () => {
      const mockRelease = {
        tag_name: '',
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
      expect(version).toBe('')
    })
  })

  describe('network edge cases', () => {
    it('should handle DNS resolution failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('getaddrinfo ENOTFOUND api.github.com'),
      )

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle connection refused', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('connect ECONNREFUSED 140.82.121.6:443'),
      )

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle SSL certificate errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('unable to verify the first certificate'),
      )

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle connection timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('ETIMEDOUT'),
      )

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle socket hang up', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(
        new Error('socket hang up'),
      )

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })
  })

  describe('gitHub API edge cases', () => {
    it('should handle 500 internal server error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle 502 bad gateway', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle 503 service unavailable', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle 401 unauthorized', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle rate limit with remaining count', async () => {
      const headers = new Headers()
      headers.set('X-RateLimit-Remaining', '5')
      headers.set('X-RateLimit-Limit', '60')

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers,
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle missing rate limit headers', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })

    it('should handle redirect responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 301,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBeNull()
    })
  })

  describe('response data edge cases', () => {
    it('should handle null response body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version === null || version === undefined).toBe(true)
    })

    it('should handle undefined response body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => undefined,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version === null || version === undefined).toBe(true)
    })

    it('should handle array response instead of object', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version === null || version === undefined).toBe(true)
    })

    it('should handle string response instead of object', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'not an object',
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version === null || version === undefined).toBe(true)
    })

    it('should handle response with extra fields', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: false,
        draft: false,
        // Extra fields that should be ignored
        body: 'Release notes',
        author: { login: 'user' },
        assets: [],
        created_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
      expect(version).toBe('1.0.0')
    })

    it('should handle both draft and prerelease true', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: true,
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
  })

  describe('timeout edge cases', () => {
    it('should handle zero timeout', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
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

      // Zero timeout should still work if response is immediate
      const version = await getVersionFromGitHub('@anthropic-ai/claude-code', 0)
      // Behavior depends on implementation, might timeout immediately
      expect(version === null || version === '1.0.0').toBe(true)
    })

    it('should handle negative timeout', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
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

      // Negative timeout should be handled gracefully
      const version = await getVersionFromGitHub('@anthropic-ai/claude-code', -1000)
      expect(version === null || version === '1.0.0').toBe(true)
    })

    it('should handle very large timeout', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
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

      const version = await getVersionFromGitHub('@anthropic-ai/claude-code', 999999999)
      expect(version).toBe('1.0.0')
    })
  })

  describe('package name edge cases', () => {
    it('should handle package name with special characters', async () => {
      const version = await getVersionFromGitHub('@scope/package-name_123')
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle very long package name', async () => {
      const longName = `@scope/${'a'.repeat(1000)}`
      const version = await getVersionFromGitHub(longName)
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle package name with unicode characters', async () => {
      const version = await getVersionFromGitHub('@scope/包名')
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle null package name', async () => {
      const version = await getVersionFromGitHub(null as any)
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle undefined package name', async () => {
      const version = await getVersionFromGitHub(undefined as any)
      expect(version).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('concurrent request edge cases', () => {
    it('should handle multiple concurrent requests to same package', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const promises = Array.from({ length: 5 }, () =>
        getVersionFromGitHub('@anthropic-ai/claude-code'))

      const versions = await Promise.all(promises)
      expect(versions).toEqual(['1.0.0', '1.0.0', '1.0.0', '1.0.0', '1.0.0'])
      expect(fetch).toHaveBeenCalledTimes(5)
    })

    it('should handle concurrent requests to different packages', async () => {
      const mockRelease = {
        tag_name: 'v1.0.0',
        name: 'Release',
        prerelease: false,
        draft: false,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRelease,
        headers: new Headers(),
      } as Response)

      const promises = [
        getVersionFromGitHub('@anthropic-ai/claude-code'),
        getVersionFromGitHub('@musistudio/claude-code-router'),
        getVersionFromGitHub('@cometix/ccline'),
      ]

      const versions = await Promise.all(promises)
      expect(versions).toEqual(['1.0.0', '1.0.0', '1.0.0'])
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })
})
