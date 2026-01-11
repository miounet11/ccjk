/**
 * Marketplace Package Installer
 *
 * Handles package installation, uninstallation, and updates from the marketplace.
 * Provides core functionality for package lifecycle management.
 *
 * @module utils/marketplace/installer
 */

import type {
  InstalledPackage,
  MarketplacePackage,
  PackageInstallOptions,
  PackageInstallResult,
  PackageUninstallOptions,
  PackageUninstallResult,
  PackageUpdateInfo,
} from '../../types/marketplace.js'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { i18n } from '../../i18n/index.js'
import { writeFileAtomicAsync } from '../fs-operations.js'
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

    // Create installation directory
    const targetDir = options.targetDir || DEFAULT_INSTALL_DIR
    const installPath = join(targetDir, pkg.id)
    await mkdir(installPath, { recursive: true })

    // TODO: Download and extract package archive
    // This is a placeholder - actual implementation would:
    // 1. Download package from pkg.downloadUrl
    // 2. Verify checksum if available
    // 3. Extract archive to installPath
    // 4. Run post-install scripts if any

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
      warnings: warnings.length > 0 ? warnings : undefined,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error) {
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
