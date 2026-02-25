/**
 * Health Check Auto-Fixer
 * Executes fix commands for failed/warned health checks
 */
import ansis from 'ansis'
import { x } from 'tinyexec'
import { i18n } from '../i18n'
import type { HealthResult } from './types'

export interface FixResult {
  checkName: string
  commandExecuted: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

export interface AutoFixReport {
  attempted: number
  succeeded: number
  failed: number
  results: FixResult[]
}

/**
 * Execute fix commands for health results that have a command field.
 * Prompts user before each fix unless autoApprove is set.
 */
export async function autoFix(
  results: HealthResult[],
  options: { autoApprove?: boolean; dryRun?: boolean } = {},
): Promise<AutoFixReport> {
  const isZh = i18n.language === 'zh-CN'
  const fixable = results.filter(r => r.status !== 'pass' && r.command)
  const report: AutoFixReport = { attempted: 0, succeeded: 0, failed: 0, results: [] }

  if (fixable.length === 0) return report

  const { default: inquirer } = await import('inquirer')

  for (const result of fixable) {
    const cmd = result.command!

    console.log('')
    console.log(ansis.yellow(`  [!] ${result.name}: ${result.message}`))
    if (result.fix) {
      console.log(ansis.dim(`      ${result.fix}`))
    }
    console.log(ansis.cyan(`      ${isZh ? '修复命令' : 'Fix command'}: ${cmd}`))

    if (options.dryRun) {
      console.log(ansis.dim(`      [dry-run] ${isZh ? '跳过执行' : 'skipped'}`))
      continue
    }

    let shouldRun = options.autoApprove ?? false
    if (!shouldRun) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: isZh ? '是否执行修复？' : 'Run fix?',
        default: true,
      }])
      shouldRun = confirm
    }

    if (!shouldRun) continue

    report.attempted++
    const start = Date.now()
    try {
      const [bin, ...args] = cmd.split(' ')
      const proc = await x(bin, args, { throwOnError: false })
      const durationMs = Date.now() - start
      const exitCode = proc.exitCode ?? 0

      const fixResult: FixResult = {
        checkName: result.name,
        commandExecuted: cmd,
        exitCode,
        stdout: proc.stdout || '',
        stderr: proc.stderr || '',
        durationMs,
      }
      report.results.push(fixResult)

      if (exitCode === 0) {
        report.succeeded++
        console.log(ansis.green(`      ✔ ${isZh ? '修复成功' : 'Fixed'} (${durationMs}ms)`))
      }
      else {
        report.failed++
        console.log(ansis.red(`      ✖ ${isZh ? '修复失败' : 'Failed'} (exit ${exitCode})`))
        if (proc.stderr) {
          console.log(ansis.dim(`        ${proc.stderr.trim().split('\n')[0]}`))
        }
      }
    }
    catch (err) {
      report.failed++
      const durationMs = Date.now() - start
      report.results.push({
        checkName: result.name,
        commandExecuted: cmd,
        exitCode: 1,
        stdout: '',
        stderr: String(err),
        durationMs,
      })
      console.log(ansis.red(`      ✖ ${isZh ? '执行出错' : 'Error'}: ${String(err)}`))
    }
  }

  if (report.attempted > 0) {
    console.log('')
    console.log(ansis.bold(
      `  ${isZh ? '修复结果' : 'Fix summary'}: ${report.succeeded}/${report.attempted} ${isZh ? '成功' : 'succeeded'}`,
    ))
  }

  return report
}
