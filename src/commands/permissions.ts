/**
 * CCJK Permissions CLI Commands
 *
 * Provides command-line interface for managing CCJK permissions
 */

import type { CliOptions } from '../cli-lazy'
import type { Permission, PermissionType } from '../permissions/permission-manager'
import process from 'node:process'
import chalk from 'chalk'
import { getPermissionManager } from '../permissions/permission-manager'

const permissionManager = getPermissionManager()

/**
 * List all permissions
 */
export async function listPermissions(options: CliOptions): Promise<void> {
  const format = (options.format as string) || 'table'
  const verbose = options.verbose as boolean || false

  const permissions = permissionManager.listPermissions()

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
      const typeColor = getTypeColor(perm.type)
      console.log(`${chalk.cyan(perm.pattern)}: ${typeColor(perm.type)}`)
      if (verbose && perm.description) {
        console.log(chalk.gray(`  Description: ${perm.description}`))
      }
    }
  }
  else {
    // Table format
    console.log(chalk.bold('Pattern'.padEnd(40)) + chalk.bold('Type'.padEnd(15)) + chalk.bold('Scope'))
    console.log('─'.repeat(70))

    for (const perm of permissions) {
      const typeColor = getTypeColor(perm.type)
      const pattern = perm.pattern.padEnd(40)
      const type = typeColor(perm.type.padEnd(15))
      const scope = perm.scope

      console.log(`${pattern}${type}${scope}`)

      if (verbose && perm.description) {
        console.log(chalk.gray(`  Description: ${perm.description}`))
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

  const action = (options.action as string) || 'read'
  const verbose = options.verbose as boolean || false

  console.log(chalk.bold(`\n🔍 Checking permission for: ${chalk.cyan(resource)}\n`))

  const result = permissionManager.checkPermission(action, resource)

  if (result.allowed) {
    console.log(chalk.green('✓ Permission granted'))
    console.log(`  Reason: ${result.reason}`)
    if (verbose && result.matchedRule) {
      console.log(`  Matched rule: ${result.matchedRule.pattern}`)
      console.log(`  Rule type: ${result.matchedRule.type}`)
    }
  }
  else {
    console.log(chalk.red('✗ Permission denied'))
    console.log(`  Reason: ${result.reason}`)
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

  const permission: Permission = {
    type: 'allow',
    pattern: resource,
    scope: 'global',
    description: 'Granted via CLI',
  }

  permissionManager.addPermission(permission)

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

  const removed = permissionManager.removePermission(resource)

  if (removed > 0) {
    console.log(chalk.green(`Permission revoked successfully! (${removed} rule(s) removed)`))
  }
  else {
    console.log(chalk.yellow('No matching permission found.'))
  }
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

  permissionManager.clearPermissions()

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

  const permissions = permissionManager.exportPermissions()
  await fs.writeFile(outputPath, JSON.stringify(permissions, null, 2), 'utf-8')

  const totalCount = permissions.allow.length + permissions.deny.length
  console.log(chalk.green(`Exported ${totalCount} permissions successfully!`))
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
    const config = JSON.parse(content)

    // Validate format
    if (!config.allow && !config.deny) {
      throw new TypeError('Invalid permissions file format. Expected { allow: [], deny: [] }')
    }

    // Import permissions (replace existing)
    permissionManager.importPermissions(config, false)

    const totalCount = (config.allow?.length || 0) + (config.deny?.length || 0)
    console.log(chalk.green(`Imported ${totalCount} permissions successfully!`))
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
  console.log('  --verbose, -v     Verbose output')
  console.log('  --action, -a      Action to check (read|write|admin)\n')

  console.log(chalk.bold('Examples:'))
  console.log('  ccjk permissions list')
  console.log('  ccjk permissions check "Provider(302ai):*"')
  console.log('  ccjk permissions grant "Provider(302ai):*"')
  console.log('  ccjk permissions export permissions.json')
  console.log('  ccjk permissions import permissions.json\n')
}

/**
 * Get color for permission type
 */
function getTypeColor(type: PermissionType): (text: string) => string {
  switch (type) {
    case 'allow':
      return chalk.green
    case 'deny':
      return chalk.red
    default:
      return chalk.gray
  }
}
