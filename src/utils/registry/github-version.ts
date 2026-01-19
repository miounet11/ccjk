/**
 * GitHub Version Fetcher
 *
 * Provides fallback version checking via GitHub Releases API when npm registry is unavailable.
 * This is a degraded service with rate limits (60 requests/hour unauthenticated).
 *
 * @module utils/registry/github-version
 */

/**
 * Package name to GitHub repository mapping
 *
 * Maps npm package names to their corresponding GitHub repositories.
 * Used to construct GitHub API URLs for version checking.
 */
const PACKAGE_TO_REPO: Record<string, string> = {
  '@anthropic-ai/claude-code': 'anthropics/claude-code',
  '@musistudio/claude-code-router': 'musi-studio/claude-code-router',
  '@cometix/ccline': 'cometix/ccline',
}

/**
 * Default timeout for GitHub API requests (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000

/**
 * GitHub API response for latest release
 *
 * Represents the structure of GitHub's releases/latest endpoint response.
 * Only includes fields we actually use.
 */
interface GitHubRelease {
  tag_name: string
  name: string
  prerelease: boolean
  draft: boolean
}

/**
 * Extract version number from GitHub tag name
 *
 * Removes common prefixes like 'v' from tag names to get clean version numbers.
 * Examples:
 * - "v1.2.3" → "1.2.3"
 * - "1.2.3" → "1.2.3"
 * - "release-1.2.3" → "1.2.3"
 *
 * @param tagName - Git tag name from GitHub release
 * @returns Clean version number
 */
function extractVersionFromTag(tagName: string): string {
  // Remove common prefixes: version-, release-, v (order matters - longest first)
  return tagName.replace(/^(version-|release-|v)/i, '')
}

/**
 * Get latest version from GitHub Releases API
 *
 * Fetches the latest release version for a package from GitHub.
 * This is a fallback mechanism when npm registry is unavailable.
 *
 * Rate Limits:
 * - Unauthenticated: 60 requests/hour
 * - Authenticated: 5000 requests/hour (not implemented)
 *
 * @param packageName - npm package name (e.g., "@anthropic-ai/claude-code")
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Version string or null if unavailable
 *
 * @example
 * ```typescript
 * const version = await getVersionFromGitHub('@anthropic-ai/claude-code')
 * if (version) {
 *   console.log(`Latest version: ${version}`)
 * }
 * ```
 */
export async function getVersionFromGitHub(
  packageName: string,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<string | null> {
  // Check if we have a GitHub repository mapping for this package
  const repo = PACKAGE_TO_REPO[packageName]
  if (!repo) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ccjk-cli',
        // GitHub API requires User-Agent header
        // Using X-GitHub-Api-Version for API stability
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    // Handle rate limiting gracefully
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
      if (rateLimitRemaining === '0') {
        // Rate limit exceeded, return null instead of throwing
        return null
      }
    }

    // Handle other non-OK responses
    if (!response.ok) {
      return null
    }

    const release = await response.json() as GitHubRelease

    // Skip draft and prerelease versions
    if (release.draft || release.prerelease) {
      return null
    }

    // Extract and return clean version number
    return extractVersionFromTag(release.tag_name)
  }
  catch {
    // Handle timeout, network errors, and other failures gracefully
    // Return null instead of throwing to allow fallback strategies
    return null
  }
  finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Check if a package is supported for GitHub version checking
 *
 * @param packageName - npm package name
 * @returns true if package has GitHub repository mapping
 */
export function isGitHubVersionSupported(packageName: string): boolean {
  return packageName in PACKAGE_TO_REPO
}

/**
 * Get all supported packages for GitHub version checking
 *
 * @returns Array of supported package names
 */
export function getSupportedPackages(): string[] {
  return Object.keys(PACKAGE_TO_REPO)
}
