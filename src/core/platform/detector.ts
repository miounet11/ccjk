/**
 * Platform Abstraction Layer - Platform Detector
 *
 * Detects the current platform, variant, and capabilities.
 * Supports Windows, macOS, Linux, WSL, Termux, Docker, and CI environments.
 *
 * @module core/platform/detector
 * @since v8.3.0
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'

import type {
  Architecture,
  OSType,
  PlatformCapabilities,
  PlatformInfo,
  PlatformVariant,
  ShellType,
} from './types'

// ============================================================================
// Platform Detection Cache
// ============================================================================

let cachedPlatformInfo: PlatformInfo | null = null
let cachedCapabilities: PlatformCapabilities | null = null

// ============================================================================
// OS Detection
// ============================================================================

/**
 * Detect the operating system type
 */
export function detectOS(): OSType {
  switch (process.platform) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'macos'
    case 'linux':
    case 'freebsd':
    case 'openbsd':
    case 'sunos':
    case 'aix':
      return 'linux'
    default:
      return 'linux' // Default to Linux for unknown Unix-like systems
  }
}

// ============================================================================
// Variant Detection
// ============================================================================

/**
 * Detect if running in WSL (Windows Subsystem for Linux)
 */
export function isWSL(): boolean {
  if (process.platform !== 'linux') {
    return false
  }

  // Check for WSL-specific indicators
  try {
    // Check /proc/version for Microsoft/WSL
    const procVersion = fs.readFileSync('/proc/version', 'utf8').toLowerCase()
    if (procVersion.includes('microsoft') || procVersion.includes('wsl')) {
      return true
    }
  } catch {
    // Ignore read errors
  }

  // Check for WSL environment variables
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
    return true
  }

  // Check for /mnt/c (common WSL mount point)
  try {
    return fs.existsSync('/mnt/c/Windows')
  } catch {
    return false
  }
}

/**
 * Detect if running in Termux (Android terminal emulator)
 */
export function isTermux(): boolean {
  if (process.platform !== 'linux') {
    return false
  }

  // Check for Termux-specific paths and environment
  return !!(
    process.env.TERMUX_VERSION ||
    process.env.PREFIX?.includes('com.termux') ||
    fs.existsSync('/data/data/com.termux')
  )
}

/**
 * Detect if running in Docker container
 */
export function isDocker(): boolean {
  // Check for .dockerenv file
  if (fs.existsSync('/.dockerenv')) {
    return true
  }

  // Check cgroup for docker
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8')
    if (cgroup.includes('docker') || cgroup.includes('kubepods')) {
      return true
    }
  } catch {
    // Ignore read errors
  }

  // Check for container environment variable
  if (process.env.container === 'docker') {
    return true
  }

  return false
}

/**
 * Detect if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TEAMCITY_VERSION ||
    process.env.TF_BUILD || // Azure Pipelines
    process.env.BITBUCKET_BUILD_NUMBER
  )
}

/**
 * Detect the platform variant
 */
export function detectVariant(): PlatformVariant {
  // Check in order of specificity
  if (isCI()) return 'ci'
  if (isDocker()) return 'docker'
  if (isWSL()) return 'wsl'
  if (isTermux()) return 'termux'
  return 'standard'
}

// ============================================================================
// Architecture Detection
// ============================================================================

/**
 * Detect CPU architecture
 */
export function detectArchitecture(): Architecture {
  const arch = process.arch as string

  // x64/x86_64
  if (arch === 'x64' || arch === 'x86_64') {
    return 'x64'
  }

  // arm64/aarch64
  if (arch === 'arm64' || arch === 'aarch64') {
    return 'arm64'
  }

  // arm/armv7l
  if (arch === 'arm' || arch === 'armv7l') {
    return 'arm'
  }

  // Default to x64 for unknown architectures
  return 'x64'
}

// ============================================================================
// Shell Detection
// ============================================================================

/**
 * Detect the default shell
 */
export function detectShell(): ShellType {
  const osType = detectOS()

  if (osType === 'windows') {
    // Check for PowerShell preference
    if (process.env.PSModulePath) {
      return 'powershell'
    }
    return 'cmd'
  }

  // Unix-like systems
  const shell = process.env.SHELL || ''
  const shellName = path.basename(shell)

  switch (shellName) {
    case 'bash':
      return 'bash'
    case 'zsh':
      return 'zsh'
    case 'fish':
      return 'fish'
    case 'sh':
      return 'sh'
    default:
      // Default to bash for Unix-like systems
      return 'bash'
  }
}

// ============================================================================
// Directory Detection
// ============================================================================

/**
 * Get the user's home directory
 */
export function getHomeDir(): string {
  // Handle Termux special case
  if (isTermux()) {
    return process.env.HOME || '/data/data/com.termux/files/home'
  }

  return os.homedir()
}

/**
 * Get the system temp directory
 */
export function getTempDir(): string {
  // Handle Termux special case
  if (isTermux()) {
    const termuxTmp = `${process.env.PREFIX}/tmp`
    if (fs.existsSync(termuxTmp)) {
      return termuxTmp
    }
  }

  return os.tmpdir()
}

/**
 * Get the user config directory
 */
export function getConfigDir(): string {
  const osType = detectOS()
  const home = getHomeDir()

  if (osType === 'windows') {
    return process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
  }

  if (osType === 'macos') {
    return path.join(home, 'Library', 'Application Support')
  }

  // Linux and others - follow XDG spec
  return process.env.XDG_CONFIG_HOME || path.join(home, '.config')
}

/**
 * Get the user data directory
 */
export function getDataDir(): string {
  const osType = detectOS()
  const home = getHomeDir()

  if (osType === 'windows') {
    return process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
  }

  if (osType === 'macos') {
    return path.join(home, 'Library', 'Application Support')
  }

  // Linux and others - follow XDG spec
  return process.env.XDG_DATA_HOME || path.join(home, '.local', 'share')
}

/**
 * Get the user cache directory
 */
export function getCacheDir(): string {
  const osType = detectOS()
  const home = getHomeDir()

  if (osType === 'windows') {
    return process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Cache')
      : path.join(home, 'AppData', 'Local', 'Cache')
  }

  if (osType === 'macos') {
    return path.join(home, 'Library', 'Caches')
  }

  // Linux and others - follow XDG spec
  return process.env.XDG_CACHE_HOME || path.join(home, '.cache')
}

// ============================================================================
// GUI Detection
// ============================================================================

/**
 * Detect if GUI is available
 */
export function hasGui(): boolean {
  const osType = detectOS()
  const variant = detectVariant()

  // CI and Docker typically don't have GUI
  if (variant === 'ci' || variant === 'docker') {
    return false
  }

  // Termux on Android may have limited GUI
  if (variant === 'termux') {
    return false
  }

  if (osType === 'windows') {
    // Windows typically has GUI unless in Server Core
    return true
  }

  if (osType === 'macos') {
    // macOS typically has GUI
    return true
  }

  // Linux - check for display
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY)
}

// ============================================================================
// Elevation Detection
// ============================================================================

/**
 * Detect if running with elevated privileges
 */
export function isElevated(): boolean {
  const osType = detectOS()

  if (osType === 'windows') {
    // On Windows, check for admin by trying to access a protected path
    try {
      fs.accessSync('C:\\Windows\\System32\\config', fs.constants.R_OK)
      return true
    } catch {
      return false
    }
  }

  // Unix-like systems - check for root
  return process.getuid?.() === 0
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Get comprehensive platform information
 *
 * Results are cached for performance. Use `clearPlatformCache()` to refresh.
 *
 * @returns Platform information object
 */
export function getPlatformInfo(): PlatformInfo {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo
  }

  const osType = detectOS()

  cachedPlatformInfo = {
    os: osType,
    variant: detectVariant(),
    arch: detectArchitecture(),
    hasGui: hasGui(),
    shell: detectShell(),
    homeDir: getHomeDir(),
    tempDir: getTempDir(),
    configDir: getConfigDir(),
    dataDir: getDataDir(),
    cacheDir: getCacheDir(),
    pathSeparator: osType === 'windows' ? '\\' : '/',
    lineEnding: osType === 'windows' ? '\r\n' : '\n',
    isElevated: isElevated(),
    nodeVersion: process.version,
    rawPlatform: process.platform,
  }

  return cachedPlatformInfo
}

// ============================================================================
// Capabilities Detection
// ============================================================================

/**
 * Get platform capabilities
 *
 * @returns Platform capabilities object
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities
  }

  const osType = detectOS()
  const variant = detectVariant()

  cachedCapabilities = {
    // Symlinks: Windows requires admin or developer mode
    symlinks: osType !== 'windows' || isElevated(),

    // Hard links: supported on all platforms
    hardLinks: true,

    // Permissions: Unix-like systems have full support
    permissions: osType !== 'windows',

    // Extended attributes: macOS and Linux support
    extendedAttributes: osType !== 'windows',

    // Case sensitivity: Windows and macOS are case-insensitive by default
    caseSensitive: osType === 'linux' && variant !== 'wsl',

    // Long paths: Windows 10+ with manifest, always on Unix
    longPaths: osType !== 'windows',

    // File locking: supported on all platforms
    fileLocking: true,

    // Trash: available on desktop environments
    trash: osType !== 'linux' || hasGui(),

    // Native watch: available on all modern platforms
    nativeWatch: true,
  }

  return cachedCapabilities
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the platform detection cache
 *
 * Useful for testing or when environment changes
 */
export function clearPlatformCache(): void {
  cachedPlatformInfo = null
  cachedCapabilities = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return detectOS() === 'windows'
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return detectOS() === 'macos'
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return detectOS() === 'linux'
}

/**
 * Check if running on a Unix-like system (macOS or Linux)
 */
export function isUnix(): boolean {
  const os = detectOS()
  return os === 'macos' || os === 'linux'
}

/**
 * Get a platform-specific value
 *
 * @param values - Object with platform-specific values
 * @returns The value for the current platform
 */
export function getPlatformValue<T>(values: {
  windows?: T
  macos?: T
  linux?: T
  default: T
}): T {
  const osType = detectOS()

  if (osType === 'windows' && values.windows !== undefined) {
    return values.windows
  }
  if (osType === 'macos' && values.macos !== undefined) {
    return values.macos
  }
  if (osType === 'linux' && values.linux !== undefined) {
    return values.linux
  }

  return values.default
}
