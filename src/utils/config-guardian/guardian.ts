/**
 * Config Guardian - Core Guardian Logic
 *
 * Main orchestrator for configuration validation and repair
 */

import type { GuardianStatus, RepairResult, ValidationResult } from './types'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import { dirname, join } from 'pathe'
import { ConfigRepairer } from './repairer'
import { ConfigValidator, EXPECTED_COMMAND_FILES } from './validator'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Default paths for CCJK configuration
 */
const CLAUDE_DIR = join(homedir(), '.claude')
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands', 'ccjk')

/**
 * ConfigGuardian class
 *
 * Main class for protecting CCJK commands from being lost after Claude Code updates
 */
export class ConfigGuardian {
  private validator: ConfigValidator
  private repairer: ConfigRepairer
  private commandsDir: string
  private sourceDir: string

  /**
   * Create a new ConfigGuardian instance
   *
   * @param options - Configuration options
   * @param options.commandsDir - Directory for CCJK commands
   * @param options.sourceDir - Source directory for command templates
   */
  constructor(options: {
    commandsDir?: string
    sourceDir?: string
  } = {}) {
    this.commandsDir = options.commandsDir || COMMANDS_DIR
    this.sourceDir = options.sourceDir || join(__dirname, '../../../templates/common/commands')

    this.validator = new ConfigValidator(this.commandsDir)
    this.repairer = new ConfigRepairer(this.commandsDir, this.sourceDir)
  }

  /**
   * Check configuration health and optionally repair
   *
   * @param autoRepair - Whether to automatically repair missing files
   * @param verbose - Whether to log detailed progress
   * @returns Guardian status with validation and repair results
   */
  async check(autoRepair = false, verbose = false): Promise<GuardianStatus> {
    if (verbose) {
      console.log(ansis.green('🛡️  Config Guardian: Checking configuration...'))
    }

    // Validate configuration
    const validation = await this.validator.validate()

    if (validation.valid) {
      if (verbose) {
        console.log(ansis.green('✓ All command files are present'))
      }

      return {
        healthy: true,
        validation,
        message: 'Configuration is healthy',
      }
    }

    // Report missing files
    if (verbose) {
      console.log(ansis.yellow(`⚠ Missing ${validation.missingFiles.length} command file(s):`))
      for (const file of validation.missingFiles) {
        console.log(ansis.yellow(`  - ${file.name}`))
      }
    }

    // Auto-repair if enabled
    if (autoRepair) {
      if (verbose) {
        console.log(ansis.green('\n🔧 Attempting automatic repair...'))
      }

      const repair = await this.repairer.repair(validation, verbose)

      if (repair.success) {
        if (verbose) {
          console.log(ansis.green(`\n✓ Repaired ${repair.repairedCount} file(s)`))
        }

        return {
          healthy: true,
          validation,
          repair,
          message: `Repaired ${repair.repairedCount} missing file(s)`,
        }
      }

      // Partial repair
      if (repair.repairedCount > 0) {
        if (verbose) {
          console.log(ansis.yellow(`\n⚠ Partially repaired: ${repair.repairedCount} succeeded, ${repair.failedFiles.length} failed`))
        }

        return {
          healthy: false,
          validation,
          repair,
          message: `Partial repair: ${repair.repairedCount} succeeded, ${repair.failedFiles.length} failed`,
        }
      }

      // Repair failed
      if (verbose) {
        console.log(ansis.red('\n✗ Repair failed'))
        for (const error of repair.errors) {
          console.log(ansis.red(`  ${error}`))
        }
      }

      return {
        healthy: false,
        validation,
        repair,
        message: `Repair failed: ${repair.errors.join(', ')}`,
      }
    }

    // No auto-repair, just report
    return {
      healthy: false,
      validation,
      message: `Missing ${validation.missingFiles.length} command file(s)`,
    }
  }

  /**
   * Force repair all command files
   *
   * @param verbose - Whether to log detailed progress
   * @returns Repair result
   */
  async forceRepair(verbose = false): Promise<RepairResult> {
    if (verbose) {
      console.log(ansis.green('🔧 Config Guardian: Force repairing all files...'))
    }

    // Create a validation result with all files marked as missing
    const allMissing: ValidationResult = {
      valid: false,
      expectedFiles: EXPECTED_COMMAND_FILES.map(name => ({
        name,
        path: join(this.commandsDir, name),
        exists: false,
      })),
      missingFiles: EXPECTED_COMMAND_FILES.map(name => ({
        name,
        path: join(this.commandsDir, name),
        exists: false,
      })),
      existingFiles: [],
      timestamp: new Date(),
    }

    return this.repairer.repair(allMissing, verbose)
  }

  /**
   * Create a backup of current configuration
   *
   * @param backupDir - Directory to store backups
   * @returns True if backup was successful
   */
  async backup(backupDir?: string): Promise<boolean> {
    const validation = await this.validator.validate()
    const targetDir = backupDir || join(CLAUDE_DIR, 'backups')

    return this.repairer.createBackup(targetDir, validation)
  }

  /**
   * Get list of expected command files
   */
  getExpectedFiles(): readonly string[] {
    return EXPECTED_COMMAND_FILES
  }

  /**
   * Get commands directory path
   */
  getCommandsDir(): string {
    return this.commandsDir
  }
}

/**
 * Create a default ConfigGuardian instance
 */
export function createConfigGuardian(): ConfigGuardian {
  return new ConfigGuardian()
}

/**
 * Quick check function for use in startup
 */
export async function quickCheck(autoRepair = true): Promise<boolean> {
  const guardian = createConfigGuardian()
  const status = await guardian.check(autoRepair, false)
  return status.healthy
}
