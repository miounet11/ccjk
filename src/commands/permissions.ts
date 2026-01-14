/**
 * CCJK Permissions CLI Commands
 *
 * Provides command-line interface for managing CCJK permissions
 */

import type { CliOptions } from '../cli-lazy'
import type { PermissionLevel } from '../permissions/permission-manager'
import process from 'node:process'
import chalk from 'chalk'
import { PermissionManager } from '../permissions/permission-manager'

const permissionManager = PermissionManager.getInstance()

/**
 * List all permissions
 */
export async function listPermissions(options: CliOptions): Promise<void> {
  const format = (options.format as string) || 'table'
  const verbose = options.verbose as boolean || false

  const permissions = permissionManager.getAllPermissions()

  if (format === 'json') {
    console.log(JSON.stringify(permissions, null, 2))
    return
  }

  console.log(chalk.bold('\n📋 CCJK Permissions\n'))

  if (permissions.length === 0) {
    console.log(chalk.yellow('No permissions configured.'))
    return
  }

  if (format === 'list') {
    for (const perm of permissions) {
      const levelColor = getLevelColor(perm.level)
      console.log(`${chalk.cyan(perm.resource)}: ${levelColor(perm.level)}`)
      if (verbose && perm.metadata) {
        console.log(chalk.gray(`  Metadata: ${JSON.stringify(perm.metadata)}`))
      }
    }
  }
  else {
    // Table format
    console.log(chalk.bold('Resource'.padEnd(40)) + chalk.bold('Level'.padEnd(15)) + chalk.bold('Granted At'))
    console.log('─'.repeat(70))

    for (const perm of permissions) {
      const levelColor = getLevelColor(perm.level)
      const resource = perm.resource.padEnd(40)
      const level = levelColor(perm.level.padEnd(15))
      const grantedAt = new Date(perm.grantedAt).toLocaleString()

      console.log(`${resource}${level}${grantedAt}`)

      if (verbose && perm.metadata) {
        console.log(chalk.gray(`  Metadata: ${JSON.stringify(perm.metadata)}`))
      }
    }
  }

  console.log()
}

/**
 * Check permission for a resource
 */
export async function checkPermission(resource: string, options: CliOptions): Promise<void> {
  if (!resource) {
    console.error(chalk.red('Error: Resource is required'))
    console.log('Usage: ccjk permissions check <resource>')
    process.exit(1)
  }

  const verbose = options.verbose as boolean || false

  console.log(chalk.bold(`\n🔍 Checking permission for: ${chalk.cyan(resource)}\n`))

  const hasPermission = await permissionManager.checkPermission(resource, 'read')
  const permission = permissionManager.getPermission(resource)

  if (hasPermission) {
    console.log(chalk.green('✓ Permission granted'))
    if (permission) {
      const levelColor = getLevelColor(permission.level)
      console.log(`  Level: ${levelColor(permission.level)}`)
      console.log(`  Granted at: ${new Date(permission.grantedAt).toLocaleString()}`)
      if (verbose && permission.metadata) {
        console.log(`  Metadata: ${JSON.stringify(permission.metadata, null, 2)}`)
      }
    }
  }
  else {
    console.log(chalk.red('✗ Permission denied'))
    console.log(chalk.yellow('  Use "ccjk permissions grant" to grant permission'))
  }

  console.log()
}

/**
 * Grant permission for a resource
 */
export async function grantPermission(resource: string, _options: CliOptions): Promise<void> {
  if (!resource) {
    console.error(chalk.red('Error: Resource is required'))
    console.log('Usage: ccjk permissions grant <resource>')
    process.exit(1)
  }

  console.log(chalk.bold(`\n✓ Granting permission for: ${chalk.cyan(resource)}\n`))

  await permissionManager.grantPermission(resource, 'full', {
    grantedBy: 'cli',
    grantedAt: new Date().toISOString(),
  })

  console.log(chalk.green('Permission granted successfully!'))
  console.log()
}

/**
 * Revoke permission for a resource
 */
export async function revokePermission(resource: string, _options: CliOptions): Promise<void> {
  if (!resource) {
    console.error(chalk.red('Error: Resource is required'))
    console.log('Usage: ccjk permissions revoke <resource>')
    process.exit(1)
  }

  console.log(chalk.bold(`\n✗ Revoking permission for: ${chalk.cyan(resource)}\n`))

  await permissionManager.revokePermission(resource)

  console.log(chalk.green('Permission revoked successfully!'))
  console.log()
}

/**
 * Reset all permissions
 */
export async function resetPermissions(_options: CliOptions): Promise<void> {
  console.log(chalk.bold('\n⚠️  Resetting all permissions\n'))

  // Confirm action
  const readline = await import('node:readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question(chalk.yellow('Are you sure you want to reset all permissions? (yes/no): '), resolve)
  })

  rl.close()

  if (answer.toLowerCase() !== 'yes') {
    console.log(chalk.gray('Operation cancelled.'))
    return
  }

  await permissionManager.clearAllPermissions()

  console.log(chalk.green('All permissions have been reset!'))
  console.log()
}

/**
 * Export permissions to a file
 */
export async function exportPermissions(filePath: string | undefined, _options: CliOptions): Promise<void> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const outputPath = filePath || path.join(process.cwd(), 'permissions.json')

  console.log(chalk.bold(`\n📤 Exporting permissions to: ${chalk.cyan(outputPath)}\n`))

  const permissions = permissionManager.getAllPermissions()
  await fs.writeFile(outputPath, JSON.stringify(permissions, null, 2), 'utf-8')

  console.log(chalk.green(`Exported ${permissions.length} permissions successfully!`))
  console.log()
}

/**
 * Import permissions from a file
 */
export async function importPermissions(filePath: string, _options: CliOptions): Promise<void> {
  if (!filePath) {
    console.error(chalk.red('Error: File path is required'))
    console.log('Usage: ccjk permissions import <file>')
    process.exit(1)
  }

  const fs = await import('node:fs/promises')

  console.log(chalk.bold(`\n📥 Importing permissions from: ${chalk.cyan(filePath)}\n`))

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const permissions = JSON.parse(content)

    if (!Array.isArray(permissions)) {
      throw new TypeError('Invalid permissions file format')
    }

    // Clear existing permissions
    await permissionManager.clearAllPermissions()

    // Import new permissions
    for (const perm of permissions) {
      await permissionManager.grantPermission(perm.resource, perm.level, perm.metadata)
    }

    console.log(chalk.green(`Imported ${permissions.length} permissions successfully!`))
  }
  catch (error) {
    console.error(chalk.red('Error importing permissions:'), error)
    process.exit(1)
  }

  console.log()
}

/**
 * Show permissions help
 */
export function permissionsHelp(_options: CliOptions): void {
  console.log(chalk.bold('\n📋 CCJK Permissions Management\n'))

  console.log(chalk.bold('Usage:'))
  console.log('  ccjk permissions [action] [...args]\n')

  console.log(chalk.bold('Actions:'))
  console.log('  list              List all permissions')
  console.log('  check <resource>  Check permission for a resource')
  console.log('  grant <resource>  Grant permission for a resource')
  console.log('  revoke <resource> Revoke permission for a resource')
  console.log('  reset             Reset all permissions')
  console.log('  export [file]     Export permissions to a file')
  console.log('  import <file>     Import permissions from a file\n')

  console.log(chalk.bold('Options:'))
  console.log('  --format, -f      Output format (table|json|list)')
  console.log('  --verbose, -v     Verbose output\n')

  console.log(chalk.bold('Examples:'))
  console.log('  ccjk permissions list')
  console.log('  ccjk permissions check file:///path/to/file')
  console.log('  ccjk permissions grant mcp://server-name')
  console.log('  ccjk permissions export permissions.json')
  console.log('  ccjk permissions import permissions.json\n')
}

/**
 * Get color for permission level
 */
function getLevelColor(level: PermissionLevel): (text: string) => string {
  switch (level) {
    case 'none':
      return chalk.red
    case 'read':
      return chalk.yellow
    case 'write':
      return chalk.blue
    case 'full':
      return chalk.green
    default:
      return chalk.gray
  }
}
