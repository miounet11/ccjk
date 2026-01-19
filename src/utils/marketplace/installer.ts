/**
 * Marketplace Package Installer
 *
 * Handles package installation, uninstallation, and updates from the marketplace.
 * Provides core functionality for package lifecycle management including:
 * - Package download with retry logic
 * - SHA256 checksum verification
 * - Archive extraction (tar.gz, zip)
 * - Post-install script execution
 * - Dependency resolution and installation
 * - Installation rollback on failure
 *
 * @module utils/marketplace/installer
 */

import type {
  InstalledPackage,
  MarketplacePackage,
  PackageInstallOptions,
  PackageInstallResult,
  PackageManifest,
  PackageUninstallOptions,
  PackageUninstallResult,
  PackageUpdateInfo,
} from '../../types/marketplace.js'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { join } from 'pathe'
import { extract as extractTar } from 'tar'
import { exec } from 'tinyexec'
import { i18n } from '../../i18n/index.js'
import { exists, readJsonFile, writeFileAtomicAsync } from '../fs-operations.js'
import { resolveDependencies } from './dependency-resolver.js'
import { getPackage } from './registry.js'

/**
 * Default installation directory
 */
const DEFAULT_INSTALL_DIR = join(homedir(), '.ccjk', 'packages')

/**
 * Installed packages manifest file
 */
const INSTALLED_MANIFEST = join(homedir(), '.ccjk', 'installed-packages.json')

/**
 * Download retry configuration
 */
const MAX_DOWNLOAD_RETRIES = 3
const DOWNLOAD_RETRY_DELAY = 2000 // 2 seconds

/**
 * Download timeout (30 seconds)
 */
const DOWNLOAD_TIMEOUT = 30000

/**
 * Get installed packages manifest
 *
 * Reads the manifest file containing all installed packages.
 *
 * @returns Array of installed packages
 */
export async function getInstalledPackages(): Promise<InstalledPackage[]> {
  if (!existsSync(INSTALLED_MANIFEST)) {
    return []
  }

  try {
    const content = await readFile(INSTALLED_MANIFEST, 'utf-8')
    return JSON.parse(content) as InstalledPackage[]
  }
  catch {
    return []
  }
}

/**
 * Save installed packages manifest
 *
 * Persists the list of installed packages to disk.
 *
 * @param packages - Array of installed packages
 */
async function saveInstalledPackages(packages: InstalledPackage[]): Promise<void> {
  const dir = join(homedir(), '.ccjk')
  await mkdir(dir, { recursive: true })
  await writeFileAtomicAsync(INSTALLED_MANIFEST, JSON.stringify(packages, null, 2))
}

/**
 * Check if package is installed
 *
 * @param packageId - Package identifier
 * @returns True if package is installed
 */
export async function isPackageInstalled(packageId: string): Promise<boolean> {
  const installed = await getInstalledPackages()
  return installed.some(pkg => pkg.package.id === packageId)
}

/**
 * Get installed package info
 *
 * @param packageId - Package identifier
 * @returns Installed package info or null if not found
 */
export async function getInstalledPackage(
  packageId: string,
): Promise<InstalledPackage | null> {
  const installed = await getInstalledPackages()
  return installed.find(pkg => pkg.package.id === packageId) || null
}

/**
 * Download package from URL with retry logic
 *
 * Downloads a package archive from the specified URL with automatic retry
 * on failure. Supports both HTTP and HTTPS protocols.
 *
 * @param url - Download URL
 * @param destPath - Destination file path
 * @param retries - Number of retry attempts (default: MAX_DOWNLOAD_RETRIES)
 * @returns True if download succeeded
 * @throws Error if download fails after all retries
 */
async function downloadPackage(
  url: string,
  destPath: string,
  retries: number = MAX_DOWNLOAD_RETRIES,
): Promise<boolean> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create destination directory
      await mkdir(join(destPath, '..'), { recursive: true })

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT)

      try {
        // Fetch package
        const response = await fetch(url, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // Stream to file
        const fileStream = createWriteStream(destPath)
        await pipeline(
          Readable.fromWeb(response.body as any),
          fileStream,
        )

        clearTimeout(timeoutId)
        return true
      }
      catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on abort
      if (lastError.name === 'AbortError') {
        throw new Error(`Download timeout after ${DOWNLOAD_TIMEOUT}ms`)
      }

      // Wait before retry (except on last attempt)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, DOWNLOAD_RETRY_DELAY * attempt))
      }
    }
  }

  throw new Error(
    `Failed to download package after ${retries} attempts: ${lastError?.message || 'Unknown error'}`,
  )
}

/**
 * Verify package checksum
 *
 * Calculates SHA256 checksum of the downloaded file and compares it
 * with the expected checksum from package metadata.
 *
 * @param filePath - Path to downloaded file
 * @param expectedChecksum - Expected SHA256 checksum
 * @returns True if checksum matches
 * @throws Error if checksum verification fails
 */
async function verifyChecksum(
  filePath: string,
  expectedChecksum: string,
): Promise<boolean> {
  try {
    const fileBuffer = await readFile(filePath)
    const hash = createHash('sha256')
    hash.update(fileBuffer)
    const actualChecksum = hash.digest('hex')

    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`,
      )
    }

    return true
  }
  catch (error) {
    throw new Error(
      `Checksum verification failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Extract package archive
 *
 * Extracts a tar.gz or zip archive to the specified directory.
 * Automatically detects archive format based on file extension.
 *
 * @param archivePath - Path to archive file
 * @param destDir - Destination directory
 * @throws Error if extraction fails
 */
async function extractPackage(
  archivePath: string,
  destDir: string,
): Promise<void> {
  try {
    await mkdir(destDir, { recursive: true })

    // Detect archive format
    if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
      // Extract tar.gz
      await extractTar({
        file: archivePath,
        cwd: destDir,
        strip: 1, // Strip top-level directory
      })
    }
    else if (archivePath.endsWith('.zip')) {
      // Extract zip using unzip command
      // Note: This requires unzip to be installed on the system
      const result = await exec('unzip', ['-q', '-o', archivePath, '-d', destDir])
      if (result.exitCode !== 0) {
        throw new Error(`Unzip failed: ${result.stderr || 'Unknown error'}`)
      }
    }
    else {
      throw new Error(`Unsupported archive format: ${archivePath}`)
    }
  }
  catch (error) {
    throw new Error(
      `Failed to extract package: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Run post-install script
 *
 * Executes the post-install script specified in the package manifest.
 * The script is run in the package installation directory.
 *
 * @param installPath - Package installation directory
 * @param manifest - Package manifest
 * @throws Error if script execution fails
 */
async function runPostInstall(
  installPath: string,
  manifest: PackageManifest,
): Promise<void> {
  if (!manifest.postInstall) {
    return
  }

  try {
    const scriptPath = join(installPath, manifest.postInstall)

    if (!exists(scriptPath)) {
      throw new Error(`Post-install script not found: ${scriptPath}`)
    }

    // Execute script
    const result = await exec('node', [scriptPath], {
      nodeOptions: {
        cwd: installPath,
      },
    })

    if (result.exitCode !== 0) {
      throw new Error(`Script exited with code ${result.exitCode}: ${result.stderr || ''}`)
    }
  }
  catch (error) {
    throw new Error(
      `Post-install script failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Rollback installation
 *
 * Removes partially installed package and cleans up temporary files.
 *
 * @param installPath - Package installation directory
 * @param archivePath - Downloaded archive path (optional)
 */
async function rollbackInstallation(
  installPath: string,
  archivePath?: string,
): Promise<void> {
  try {
    // Remove installation directory
    if (existsSync(installPath)) {
      await rm(installPath, { recursive: true, force: true })
    }

    // Remove downloaded archive
    if (archivePath && existsSync(archivePath)) {
      await rm(archivePath, { force: true })
    }
  }
  catch (error) {
    // Log but don't throw - rollback is best-effort
    console.error('Rollback failed:', error)
  }
}

/**
 * Install a package from the marketplace
 *
 * Downloads and installs a package with all its dependencies.
 * Handles version resolution, checksum verification, and post-install scripts.
 *
 * @param packageId - Package identifier
 * @param options - Installation options
 * @returns Installation result
 */
export async function installPackage(
  packageId: string,
  options: PackageInstallOptions = {},
): Promise<PackageInstallResult> {
  const startTime = Date.now()
  let archivePath: string | undefined
  let installPath: string | undefined

  try {
    // Check if already installed
    const alreadyInstalled = await isPackageInstalled(packageId)
    if (alreadyInstalled && !options.force) {
      const pkg = await getPackage(packageId)
      if (!pkg) {
        return {
          success: false,
          package: {} as MarketplacePackage,
          error: i18n.t('marketplace:packageNotFound', { name: packageId }),
        }
      }

      return {
        success: true,
        package: pkg,
        alreadyInstalled: true,
        durationMs: Date.now() - startTime,
      }
    }

    // Fetch package metadata
    const pkg = await getPackage(packageId)
    if (!pkg) {
      return {
        success: false,
        package: {} as MarketplacePackage,
        error: i18n.t('marketplace:packageNotFound', { name: packageId }),
      }
    }

    // Validate download URL
    if (!pkg.downloadUrl) {
      return {
        success: false,
        package: pkg,
        error: i18n.t('marketplace:noDownloadUrl', { name: pkg.name }),
      }
    }

    // Validate compatibility
    const warnings: string[] = []
    if (options.codeToolType && pkg.supportedTools) {
      if (!pkg.supportedTools.includes(options.codeToolType)) {
        warnings.push(
          i18n.t('marketplace:incompatibleTool', {
            tool: options.codeToolType,
            supported: pkg.supportedTools.join(', '),
          }),
        )
      }
    }

    // Resolve and install dependencies first
    const dependencyResults: PackageInstallResult[] = []
    if (options.installDependencies !== false && pkg.dependencies) {
      try {
        const dependencyTree = await resolveDependencies(pkg)

        // Install dependencies in order
        for (const dep of dependencyTree.dependencies) {
          const depResult = await installPackage(dep.package.id, {
            ...options,
            installDependencies: true, // Recursive dependency installation
          })

          dependencyResults.push(depResult)

          if (!depResult.success) {
            throw new Error(
              `Failed to install dependency ${dep.package.id}: ${depResult.error}`,
            )
          }
        }
      }
      catch (error) {
        return {
          success: false,
          package: pkg,
          error: `Dependency resolution failed: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: Date.now() - startTime,
        }
      }
    }

    // Create installation directory
    const targetDir = options.targetDir || DEFAULT_INSTALL_DIR
    installPath = join(targetDir, pkg.id)
    await mkdir(installPath, { recursive: true })

    // Download package archive
    const archiveExt = pkg.downloadUrl.endsWith('.zip') ? '.zip' : '.tar.gz'
    archivePath = join(targetDir, `${pkg.id}-${pkg.version}${archiveExt}`)

    try {
      await downloadPackage(pkg.downloadUrl, archivePath)
    }
    catch (error) {
      throw new Error(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // Verify checksum if available and not skipped
    if (pkg.checksum && !options.skipChecksum) {
      try {
        await verifyChecksum(archivePath, pkg.checksum)
      }
      catch (error) {
        throw new Error(
          `Checksum verification failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Extract package
    try {
      await extractPackage(archivePath, installPath)
    }
    catch (error) {
      throw new Error(
        `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // Read package manifest
    const manifestPath = join(installPath, 'ccjk.json')
    let manifest: PackageManifest | null = null

    if (exists(manifestPath)) {
      try {
        manifest = readJsonFile<PackageManifest>(manifestPath)
      }
      catch (error) {
        warnings.push(
          `Failed to read package manifest: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Run post-install script if available
    if (manifest?.postInstall) {
      try {
        await runPostInstall(installPath, manifest)
      }
      catch (error) {
        warnings.push(
          `Post-install script failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Clean up downloaded archive
    if (archivePath && existsSync(archivePath)) {
      await rm(archivePath, { force: true })
    }

    // Add to installed packages
    const installed = await getInstalledPackages()
    const installedPackage: InstalledPackage = {
      package: pkg,
      path: installPath,
      installedAt: new Date().toISOString(),
      source: 'marketplace',
      enabled: true,
    }

    // Remove old version if exists
    const existingIndex = installed.findIndex(p => p.package.id === pkg.id)
    if (existingIndex >= 0) {
      installed[existingIndex] = installedPackage
    }
    else {
      installed.push(installedPackage)
    }

    await saveInstalledPackages(installed)

    return {
      success: true,
      package: pkg,
      installedPath: installPath,
      dependencies: dependencyResults.length > 0 ? dependencyResults : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error) {
    // Rollback on failure
    if (installPath) {
      await rollbackInstallation(installPath, archivePath)
    }

    return {
      success: false,
      package: {} as MarketplacePackage,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Uninstall a package
 *
 * Removes a package and optionally its dependencies.
 *
 * @param packageId - Package identifier
 * @param options - Uninstallation options
 * @returns Uninstallation result
 */
export async function uninstallPackage(
  packageId: string,
  options: PackageUninstallOptions = {},
): Promise<PackageUninstallResult> {
  try {
    const installed = await getInstalledPackages()
    const pkg = installed.find(p => p.package.id === packageId)

    if (!pkg) {
      return {
        success: false,
        packageId,
        error: i18n.t('marketplace:packageNotInstalled', { name: packageId }),
      }
    }

    // Check if other packages depend on this one
    if (!options.force) {
      const dependents = installed.filter(p =>
        p.package.dependencies && Object.keys(p.package.dependencies).includes(packageId),
      )

      if (dependents.length > 0) {
        return {
          success: false,
          packageId,
          error: i18n.t('marketplace:packageHasDependents', {
            name: packageId,
            dependents: dependents.map(p => p.package.name).join(', '),
          }),
        }
      }
    }

    // Remove package directory
    if (existsSync(pkg.path)) {
      await rm(pkg.path, { recursive: true, force: true })
    }

    // Remove from installed packages
    const updated = installed.filter(p => p.package.id !== packageId)
    await saveInstalledPackages(updated)

    return {
      success: true,
      packageId,
    }
  }
  catch (error) {
    return {
      success: false,
      packageId,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Update a package to the latest version
 *
 * @param packageId - Package identifier
 * @returns Installation result
 */
export async function updatePackage(packageId: string): Promise<PackageInstallResult> {
  // Uninstall old version
  const uninstallResult = await uninstallPackage(packageId, { keepConfig: true })
  if (!uninstallResult.success) {
    return {
      success: false,
      package: {} as MarketplacePackage,
      error: uninstallResult.error,
    }
  }

  // Install latest version
  return await installPackage(packageId, { force: true })
}

/**
 * Check for package updates
 *
 * Compares installed packages with registry to find available updates.
 *
 * @returns Array of available updates
 */
export async function checkForUpdates(): Promise<PackageUpdateInfo[]> {
  const installed = await getInstalledPackages()
  const updates: PackageUpdateInfo[] = []

  for (const installedPkg of installed) {
    const latestPkg = await getPackage(installedPkg.package.id)
    if (!latestPkg)
      continue

    if (latestPkg.version !== installedPkg.package.version) {
      updates.push({
        id: installedPkg.package.id,
        currentVersion: installedPkg.package.version,
        latestVersion: latestPkg.version,
        breaking: false, // TODO: Implement semver comparison
        changelog: latestPkg.changelog,
        releaseDate: latestPkg.updatedAt,
      })
    }
  }

  return updates
}

/**
 * Enable a package
 *
 * @param packageId - Package identifier
 * @returns True if successful
 */
export async function enablePackage(packageId: string): Promise<boolean> {
  const installed = await getInstalledPackages()
  const pkg = installed.find(p => p.package.id === packageId)

  if (!pkg)
    return false

  pkg.enabled = true
  await saveInstalledPackages(installed)
  return true
}

/**
 * Disable a package
 *
 * @param packageId - Package identifier
 * @returns True if successful
 */
export async function disablePackage(packageId: string): Promise<boolean> {
  const installed = await getInstalledPackages()
  const pkg = installed.find(p => p.package.id === packageId)

  if (!pkg)
    return false

  pkg.enabled = false
  await saveInstalledPackages(installed)
  return true
}
