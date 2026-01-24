/**
 * CCJK Setup Command for v8.0.0
 *
 * Complete local setup based on project analysis.
 *
 * Usage:
 *   ccjk ccjk:setup                    - Interactive recommended setup
 *   ccjk ccjk:setup --profile minimal   - Minimal setup
 *   ccjk ccjk:setup --dry-run          - Preview without installing
 *   ccjk ccjk:setup --json             - JSON output for automation
 */

import type { SupportedLang } from '../constants'
import { i18n } from '../i18n'
import { consola } from 'consola'
import ansis from 'ansis'
import { cwd } from 'node:process'
import { ProjectAnalyzer } from '../analyzers'
import { SetupOrchestrator, type SetupOrchestratorOptions, type SetupResult } from '../orchestrators/setup-orchestrator'

/**
 * Command options interface
 */
export interface CcjkSetupOptions extends SetupOrchestratorOptions {
  /** Language */
  lang?: SupportedLang
}

/**
 * Main command handler
 */
export async function ccjkSetup(options: CcjkSetupOptions = {}): Promise<number> {
  // Set language
  const lang = options.lang || 'en'
  if (lang !== i18n.language) {
    await i18n.changeLanguage(lang)
  }

  const isZh = i18n.language === 'zh-CN'
  const logger = options.verbose ? consola : consola.create({ level: 1 })

  // Create analyzer and orchestrator
  const analyzer = new ProjectAnalyzer()
  const orchestrator = new SetupOrchestrator(analyzer)

  // JSON mode
  if (options.json) {
    const result = await orchestrator.execute({
      ...options,
      showProgress: false,
      interactive: false,
      projectPath: cwd(),
      lang,
    })

    console.log(JSON.stringify(result, null, 2))
    return result.success ? 0 : 1
  }

  // Show header
  logger.log('')
  logger.log(ansis.cyan(ansis.bold(`🚀 ${isZh ? 'CCJK 完整本地设置' : 'CCJK Complete Local Setup'}`)))
  logger.log(ansis.gray(isZh ? '基于项目分析的智能配置' : 'Project-based intelligent setup'))
  logger.log('')

  try {
    // Run setup
    const result = await orchestrator.execute({
      ...options,
      projectPath: cwd(),
      lang,
    })

    // Show results
    await showResults(result, options, logger)

    return result.success ? 0 : 1
  } catch (error) {
    logger.error(isZh ? '设置失败' : 'Setup failed')
    if (options.verbose) {
      logger.error(error)
    }
    return 1
  }
}

/**
 * Show setup results
 */
async function showResults(result: SetupResult, options: CcjkSetupOptions, logger: any) {
  const isZh = i18n.language === 'zh-CN'

  logger.log('')

  if (result.success) {
    logger.log(ansis.green(ansis.bold(isZh ? '✅ 设置完成！' : '✅ Setup Complete!')))
    logger.log('')

    // Summary
    const summary = [
      `${isZh ? '技能' : 'Skills'}: ${result.phases.skills?.installed?.length || 0} ${isZh ? '已安装' : 'installed'}`,
      `${isZh ? 'MCP' : 'MCP'}: ${result.phases.mcp?.installed?.length || 0} ${isZh ? '已安装' : 'installed'}`,
      `${isZh ? '代理' : 'Agents'}: ${result.phases.agents?.installed?.length || 0} ${isZh ? '已创建' : 'created'}`,
      `${isZh ? '钩子' : 'Hooks'}: ${result.phases.hooks?.installed?.length || 0} ${isZh ? '已配置' : 'configured'}`,
    ]
    logger.log(ansis.bold(isZh ? '摘要:' : 'Summary:'))
    summary.forEach(line => logger.log(`  ${line}`))
    logger.log('')

    // Next steps
    logger.log(ansis.bold(isZh ? '下一步:' : 'Next steps:'))
    logger.log(`  • ${isZh ? '使用 /ccjk:all 获取云AI推荐' : 'Use /ccjk:all for cloud AI recommendations'}`)
    logger.log(`  • ${isZh ? '重启 Claude Code 以应用更改' : 'Restart Claude Code to apply changes'}`)
    logger.log('')
  } else {
    logger.log(ansis.yellow(ansis.bold(isZh ? '⚠️ 设置部分失败' : '⚠️ Setup Partially Failed')))
    logger.log('')

    if (result.errors && result.errors.length > 0) {
      logger.log(ansis.bold(isZh ? '错误:' : 'Errors:'))
      result.errors.forEach(err => logger.log(`  • ${err}`))
      logger.log('')
    }

    if (options.rollbackOnError) {
      logger.log(isZh ? '💡 提示: 使用 --no-rollback 保留已安装的资源' : '💡 Tip: Use --no-rollback to keep installed resources')
    }
  }

  if (options.report && result.report) {
    logger.log(ansis.bold(isZh ? '📊 详细报告:' : '📊 Detailed Report:'))
    logger.log('')
    logger.log(result.report)
  }
}
