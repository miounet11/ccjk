/**
 * Marketplace CLI Commands
 *
 * Provides CLI interface for the CCJK marketplace functionality:
 * - Search for packages (plugins, skills, workflows, etc.)
 * - Install packages from the registry
 * - Uninstall packages
 * - Update packages to latest versions
 * - List installed packages
 * - Show detailed package information
 *
 * @module commands/marketplace
 */

import type { CAC } from 'cac'
import ansis from 'ansis'
import { i18n } from '../i18n/index.js'
import {
  checkForUpdates,
  getInstalledPackages,
  installPackage,
  isPackageInstalled,
  uninstallPackage,
  updatePackage,
} from '../utils/marketplace/installer.js'
import {
  getPackage,
  searchPackages,
} from '../utils/marketplace/registry.js'

interface MarketplaceOptions {
  lang?: string
  force?: boolean
  skipVerification?: boolean
}

/**
 * Search for packages in the marketplace
 */
async function searchCommand(query: string, _options: MarketplaceOptions): Promise<void> {
  try {
    console.log(ansis.green(i18n.t('marketplace:searching', { query })))

    const results = await searchPackages({ query })

    if (results.packages.length === 0) {
      console.log(ansis.yellow(i18n.t('marketplace:noResults')))
      return
    }

    console.log(ansis.green(i18n.t('marketplace:searchResults', { count: results.packages.length })))
    console.log()

    for (const pkg of results.packages) {
      const installed = await isPackageInstalled(pkg.name)
      const installedMark = installed ? ansis.green('✓') : ansis.gray('○')

      console.log(`${installedMark} ${ansis.bold(pkg.name)} ${ansis.gray(`v${pkg.version}`)}`)
      console.log(`  ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`  ${ansis.gray(i18n.t('marketplace:packageInfo.category'))}: ${pkg.category}`)

      if (pkg.verified === 'verified') {
        console.log(`  ${ansis.green('✓')} ${i18n.t('marketplace:packageInfo.verified')}`)
      }

      console.log()
    }
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:searchFailed')))
    console.error(err)
    throw err
  }
}

/**
 * Install a package from the marketplace
 */
async function installCommand(packageName: string, options: MarketplaceOptions): Promise<void> {
  try {
    // Check if already installed
    if (await isPackageInstalled(packageName)) {
      console.log(ansis.yellow(`Package '${packageName}' is already installed`))
      return
    }

    // Get package info
    const pkg = await getPackage(packageName)
    if (!pkg) {
      console.error(ansis.red(i18n.t('marketplace:packageNotFound', { name: packageName })))
      throw new Error(`Package not found: ${packageName}`)
    }

    console.log(ansis.green(i18n.t('marketplace:installing', { name: packageName })))

    // Install the package
    const result = await installPackage(packageName, {
      force: options.force,
      skipVerification: options.skipVerification,
    })

    if (result.success) {
      console.log(ansis.green(i18n.t('marketplace:installSuccess', { name: packageName })))
      if (result.installedPath) {
        console.log(ansis.gray(`${i18n.t('marketplace:installedAt')}: ${result.installedPath}`))
      }
    }
    else {
      console.error(ansis.red(i18n.t('marketplace:installFailed', { name: packageName })))
      if (result.error) {
        console.error(ansis.red(i18n.t('marketplace:errors.installError', { error: result.error })))
      }
      throw new Error(`Install failed: ${packageName}`)
    }
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:installFailed', { name: packageName })))
    console.error(err)
    throw err
  }
}

/**
 * Uninstall a package
 */
async function uninstallCommand(packageName: string, options: MarketplaceOptions): Promise<void> {
  try {
    // Check if installed
    if (!await isPackageInstalled(packageName)) {
      console.error(ansis.red(i18n.t('marketplace:packageNotInstalled', { name: packageName })))
      throw new Error(`Package not installed: ${packageName}`)
    }

    console.log(ansis.green(i18n.t('marketplace:uninstalling', { name: packageName })))

    // Uninstall the package
    const result = await uninstallPackage(packageName, {
      force: options.force,
    })

    if (result.success) {
      console.log(ansis.green(i18n.t('marketplace:uninstallSuccess', { name: packageName })))
    }
    else {
      console.error(ansis.red(i18n.t('marketplace:uninstallFailed', { name: packageName })))
      if (result.error) {
        console.error(ansis.red(i18n.t('marketplace:errors.uninstallError', { error: result.error })))
      }
      throw new Error(`Uninstall failed: ${packageName}`)
    }
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:uninstallFailed', { name: packageName })))
    console.error(err)
    throw err
  }
}

/**
 * Update packages to latest versions
 */
async function updateCommand(packageName?: string, _options?: MarketplaceOptions): Promise<void> {
  try {
    if (packageName) {
      // Update specific package
      console.log(ansis.green(i18n.t('marketplace:updating', { name: packageName })))

      const result = await updatePackage(packageName)

      if (result.success) {
        console.log(ansis.green(i18n.t('marketplace:updateSuccess', { name: packageName })))
      }
      else {
        console.error(ansis.red(i18n.t('marketplace:updateFailed', { name: packageName })))
        if (result.error) {
          console.error(ansis.red(result.error))
        }
        throw new Error(`Update failed: ${packageName}`)
      }
    }
    else {
      // Check for updates for all packages
      console.log(ansis.green(i18n.t('marketplace:checkingUpdates')))

      const updates = await checkForUpdates()

      if (updates.length === 0) {
        console.log(ansis.green(i18n.t('marketplace:noUpdates')))
        return
      }

      console.log(ansis.yellow(i18n.t('marketplace:updatesAvailable', { count: updates.length })))
      console.log()

      for (const update of updates) {
        console.log(`  ${ansis.bold(update.id)}: ${ansis.gray(update.currentVersion)} → ${ansis.green(update.latestVersion)}`)
      }

      console.log()
      console.log(ansis.gray(i18n.t('marketplace:updateHint')))
    }
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:updateCheckFailed')))
    console.error(err)
    throw err
  }
}

/**
 * List installed packages
 */
async function listCommand(_options: MarketplaceOptions): Promise<void> {
  try {
    const installedList = await getInstalledPackages()

    if (installedList.length === 0) {
      console.log(ansis.yellow(i18n.t('marketplace:noInstalled')))
      return
    }

    console.log(ansis.green(i18n.t('marketplace:installedPackages', { count: installedList.length })))
    console.log()

    for (const installed of installedList) {
      const pkg = installed.package
      console.log(`${ansis.green('✓')} ${ansis.bold(pkg.name)} ${ansis.gray(`v${pkg.version}`)}`)
      console.log(`  ${pkg.description.en || Object.values(pkg.description)[0]}`)
      console.log(`  ${ansis.gray(i18n.t('marketplace:packageInfo.category'))}: ${pkg.category}`)
      console.log()
    }
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:listFailed')))
    console.error(err)
    throw err
  }
}

/**
 * Show detailed package information
 */
async function infoCommand(packageName: string, _options: MarketplaceOptions): Promise<void> {
  try {
    const pkg = await getPackage(packageName)

    if (!pkg) {
      console.error(ansis.red(i18n.t('marketplace:packageNotFound', { name: packageName })))
      throw new Error(`Package not found: ${packageName}`)
    }

    const installed = await isPackageInstalled(packageName)

    console.log()
    console.log(ansis.bold.cyan(pkg.name))
    console.log(ansis.gray('─'.repeat(50)))
    console.log()

    console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.description'))}: ${pkg.description.en || Object.values(pkg.description)[0]}`)
    console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.version'))}: ${pkg.version}`)
    console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.category'))}: ${pkg.category}`)

    if (pkg.author) {
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.author'))}: ${pkg.author}`)
    }

    if (pkg.license) {
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.license'))}: ${pkg.license}`)
    }

    if (pkg.repository) {
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.repository'))}: ${pkg.repository}`)
    }

    if (pkg.downloads !== undefined) {
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.downloads'))}: ${pkg.downloads.toLocaleString()}`)
    }

    if (pkg.rating !== undefined) {
      const stars = '★'.repeat(Math.round(pkg.rating))
      const emptyStars = '☆'.repeat(5 - Math.round(pkg.rating))
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.rating'))}: ${ansis.yellow(stars)}${ansis.gray(emptyStars)} (${pkg.rating}/5)`)
    }

    if (pkg.keywords && pkg.keywords.length > 0) {
      console.log(`${ansis.bold(i18n.t('marketplace:packageInfo.keywords'))}: ${pkg.keywords.join(', ')}`)
    }

    if (pkg.verified === 'verified') {
      console.log(`${ansis.green('✓')} ${i18n.t('marketplace:packageInfo.verified')}`)
    }

    console.log()
    console.log(`${ansis.bold('Status')}: ${installed ? ansis.green('Installed') : ansis.gray('Not installed')}`)
    console.log()
  }
  catch (err) {
    console.error(ansis.red(i18n.t('marketplace:infoFailed')))
    console.error(err)
    throw err
  }
}

/**
 * Register marketplace commands with the CLI
 */
export async function registerMarketplaceCommands(
  cli: CAC,
  withLanguageResolution: <T extends any[]>(
    action: (...args: T) => Promise<void>,
    skipPrompt?: boolean,
  ) => Promise<(...args: T) => Promise<void>>,
): Promise<void> {
  // Search command
  cli
    .command('marketplace:search <query>', i18n.t('marketplace:commands.search'))
    .alias('mp:search')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .action(await withLanguageResolution(async (query: string, options: MarketplaceOptions) => {
      await searchCommand(query, options)
    }))

  // Install command
  cli
    .command('marketplace:install <package>', i18n.t('marketplace:commands.install'))
    .alias('mp:install')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .option('--force, -f', i18n.t('marketplace:options.force'))
    .option('--skip-verification', i18n.t('marketplace:options.skipVerification'))
    .action(await withLanguageResolution(async (packageName: string, options: MarketplaceOptions) => {
      await installCommand(packageName, options)
    }))

  // Uninstall command
  cli
    .command('marketplace:uninstall <package>', i18n.t('marketplace:commands.uninstall'))
    .alias('mp:uninstall')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .option('--force, -f', i18n.t('marketplace:options.force'))
    .action(await withLanguageResolution(async (packageName: string, options: MarketplaceOptions) => {
      await uninstallCommand(packageName, options)
    }))

  // Update command
  cli
    .command('marketplace:update [package]', i18n.t('marketplace:commands.update'))
    .alias('mp:update')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .action(await withLanguageResolution(async (packageName: string | undefined, options: MarketplaceOptions) => {
      await updateCommand(packageName, options)
    }))

  // List command
  cli
    .command('marketplace:list', i18n.t('marketplace:commands.list'))
    .alias('mp:list')
    .alias('mp:ls')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .action(await withLanguageResolution(async (options: MarketplaceOptions) => {
      await listCommand(options)
    }))

  // Info command
  cli
    .command('marketplace:info <package>', i18n.t('marketplace:commands.info'))
    .alias('mp:info')
    .option('--lang, -l <lang>', i18n.t('marketplace:options.lang'))
    .action(await withLanguageResolution(async (packageName: string, options: MarketplaceOptions) => {
      await infoCommand(packageName, options)
    }))
}

/**
 * Marketplace menu - unified entry point for cloud plugins command
 */
export async function marketplaceMenu(action?: string, options?: MarketplaceOptions): Promise<void> {
  const opts = options || {}

  if (!action) {
    // Show interactive menu
    console.log(ansis.green('\n🛒 Marketplace Commands:\n'))
    console.log('  ccjk cloud plugins search <query>  - Search packages')
    console.log('  ccjk cloud plugins install <pkg>   - Install package')
    console.log('  ccjk cloud plugins uninstall <pkg> - Uninstall package')
    console.log('  ccjk cloud plugins update [pkg]    - Update packages')
    console.log('  ccjk cloud plugins list            - List installed')
    console.log('  ccjk cloud plugins info <pkg>      - Package details\n')
    return
  }

  // Route to appropriate command
  const args = action.split(' ')
  const cmd = args[0]
  const param = args.slice(1).join(' ')

  switch (cmd) {
    case 'search':
      if (param)
        await searchCommand(param, opts)
      else
        console.log(ansis.yellow('Usage: ccjk cloud plugins search <query>'))
      break
    case 'install':
      if (param)
        await installCommand(param, opts)
      else
        console.log(ansis.yellow('Usage: ccjk cloud plugins install <package>'))
      break
    case 'uninstall':
      if (param)
        await uninstallCommand(param, opts)
      else
        console.log(ansis.yellow('Usage: ccjk cloud plugins uninstall <package>'))
      break
    case 'update':
      await updateCommand(param || undefined, opts)
      break
    case 'list':
    case 'ls':
      await listCommand(opts)
      break
    case 'info':
      if (param)
        await infoCommand(param, opts)
      else
        console.log(ansis.yellow('Usage: ccjk cloud plugins info <package>'))
      break
    default:
      console.log(ansis.yellow(`Unknown action: ${cmd}`))
      await marketplaceMenu(undefined, opts)
  }
}
