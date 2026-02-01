/**
 * CCJK Add Command
 *
 * 统一的插件添加命令，支持从多种来源安装插件：
 * - GitHub 仓库 (github:owner/repo, https://github.com/owner/repo)
 * - npm 包 (@scope/package, package-name)
 * - 本地路径 (./path, /absolute/path)
 *
 * 使用示例：
 *   ccjk add github:anthropics/claude-code-skills
 *   ccjk add @anthropic/mcp-server-filesystem
 *   ccjk add ./my-local-skill
 */

import ansis from 'ansis'
import ora from 'ora'
import { parseSource, type SourceInfo } from './source-parser'
import { installFromGitHub } from './github-installer'
import { installFromNpm } from './npm-installer'
import { installFromLocal } from './local-installer'
import { detectPluginType, type PluginType } from './type-detector'

export interface AddCommandOptions {
  type?: PluginType
  force?: boolean
  dryRun?: boolean
  json?: boolean
  lang?: 'zh-CN' | 'en'
}

export interface AddResult {
  success: boolean
  source: string
  sourceType: 'github' | 'npm' | 'local'
  pluginType: PluginType
  installedPath?: string
  error?: string
  details?: {
    name: string
    version?: string
    description?: string
    files?: string[]
  }
}

/**
 * 主命令入口
 */
export async function addCommand(
  source: string,
  options: AddCommandOptions = {},
): Promise<AddResult> {
  const { force = false, dryRun = false, json = false, lang = 'en' } = options

  const i18n = getI18n(lang)

  // 1. 解析来源
  const spinner = json ? null : ora(i18n.parsing).start()
  let sourceInfo: SourceInfo

  try {
    sourceInfo = parseSource(source)
    spinner?.succeed(i18n.parsed(sourceInfo.type))
  }
  catch (error) {
    spinner?.fail(i18n.parseFailed)
    const result: AddResult = {
      success: false,
      source,
      sourceType: 'local',
      pluginType: 'skill',
      error: error instanceof Error ? error.message : String(error),
    }
    if (json) {
      console.log(JSON.stringify(result, null, 2))
    }
    else {
      console.error(ansis.red(`\n${i18n.error}: ${result.error}\n`))
    }
    return result
  }

  // 2. 检测或使用指定的插件类型
  let pluginType = options.type
  if (!pluginType) {
    spinner?.start(i18n.detectingType)
    try {
      pluginType = await detectPluginType(sourceInfo)
      spinner?.succeed(i18n.detectedType(pluginType))
    }
    catch {
      spinner?.info(i18n.defaultType)
      pluginType = 'skill'
    }
  }

  // 3. 执行安装
  spinner?.start(dryRun ? i18n.previewInstall : i18n.installing)

  try {
    let result: AddResult

    switch (sourceInfo.type) {
      case 'github':
        result = await installFromGitHub(sourceInfo, pluginType, { force, dryRun })
        break
      case 'npm':
        result = await installFromNpm(sourceInfo, pluginType, { force, dryRun })
        break
      case 'local':
        result = await installFromLocal(sourceInfo, pluginType, { force, dryRun })
        break
      default:
        throw new Error(`Unsupported source type: ${(sourceInfo as SourceInfo).type}`)
    }

    if (result.success) {
      spinner?.succeed(dryRun ? i18n.previewSuccess : i18n.installSuccess)
    }
    else {
      spinner?.fail(i18n.installFailed)
    }

    // 输出结果
    if (json) {
      console.log(JSON.stringify(result, null, 2))
    }
    else if (result.success && !dryRun) {
      printSuccessMessage(result, i18n)
    }
    else if (result.success && dryRun) {
      printPreviewMessage(result, i18n)
    }
    else {
      console.error(ansis.red(`\n${i18n.error}: ${result.error}\n`))
    }

    return result
  }
  catch (error) {
    spinner?.fail(i18n.installFailed)
    const result: AddResult = {
      success: false,
      source,
      sourceType: sourceInfo.type,
      pluginType,
      error: error instanceof Error ? error.message : String(error),
    }
    if (json) {
      console.log(JSON.stringify(result, null, 2))
    }
    else {
      console.error(ansis.red(`\n${i18n.error}: ${result.error}\n`))
    }
    return result
  }
}

/**
 * 打印成功消息
 */
function printSuccessMessage(result: AddResult, i18n: ReturnType<typeof getI18n>): void {
  console.log()
  console.log(ansis.green.bold(`✓ ${i18n.installed}`))
  console.log()
  console.log(`  ${ansis.gray(i18n.name)}:     ${result.details?.name || result.source}`)
  if (result.details?.version) {
    console.log(`  ${ansis.gray(i18n.version)}:  ${result.details.version}`)
  }
  console.log(`  ${ansis.gray(i18n.type)}:     ${result.pluginType}`)
  console.log(`  ${ansis.gray(i18n.path)}:     ${result.installedPath}`)
  console.log()

  // 显示下一步提示
  console.log(ansis.cyan(i18n.nextSteps))
  switch (result.pluginType) {
    case 'skill':
      console.log(`  ${ansis.gray('•')} ${i18n.skillHint}`)
      break
    case 'mcp':
      console.log(`  ${ansis.gray('•')} ${i18n.mcpHint}`)
      break
    case 'agent':
      console.log(`  ${ansis.gray('•')} ${i18n.agentHint}`)
      break
    case 'hook':
      console.log(`  ${ansis.gray('•')} ${i18n.hookHint}`)
      break
  }
  console.log()
}

/**
 * 打印预览消息
 */
function printPreviewMessage(result: AddResult, i18n: ReturnType<typeof getI18n>): void {
  console.log()
  console.log(ansis.yellow.bold(`⚡ ${i18n.preview}`))
  console.log()
  console.log(`  ${ansis.gray(i18n.source)}:   ${result.source}`)
  console.log(`  ${ansis.gray(i18n.type)}:     ${result.pluginType}`)
  console.log(`  ${ansis.gray(i18n.target)}:   ${result.installedPath}`)
  if (result.details?.files?.length) {
    console.log(`  ${ansis.gray(i18n.files)}:`)
    for (const file of result.details.files.slice(0, 5)) {
      console.log(`    ${ansis.gray('•')} ${file}`)
    }
    if (result.details.files.length > 5) {
      console.log(`    ${ansis.gray('...')} ${i18n.andMore(result.details.files.length - 5)}`)
    }
  }
  console.log()
  console.log(ansis.gray(i18n.dryRunNote))
  console.log()
}

/**
 * 国际化文本
 */
function getI18n(lang: 'zh-CN' | 'en') {
  const texts = {
    'zh-CN': {
      parsing: '解析来源...',
      parsed: (type: string) => `来源类型: ${type}`,
      parseFailed: '解析来源失败',
      detectingType: '检测插件类型...',
      detectedType: (type: string) => `检测到类型: ${type}`,
      defaultType: '使用默认类型: skill',
      installing: '安装中...',
      previewInstall: '预览安装...',
      installSuccess: '安装成功',
      previewSuccess: '预览完成',
      installFailed: '安装失败',
      error: '错误',
      installed: '插件已安装',
      preview: '安装预览 (dry-run)',
      name: '名称',
      version: '版本',
      type: '类型',
      path: '路径',
      source: '来源',
      target: '目标',
      files: '文件',
      nextSteps: '下一步:',
      skillHint: '使用 /skill-name 在 Claude Code 中调用',
      mcpHint: '运行 ccjk mcp status 查看状态',
      agentHint: '使用 ccjk agent list 查看已安装的 agent',
      hookHint: '运行 ccjk hooks list 查看已安装的 hook',
      dryRunNote: '这是预览模式，未实际安装。移除 --dry-run 执行安装。',
      andMore: (n: number) => `还有 ${n} 个文件`,
    },
    en: {
      parsing: 'Parsing source...',
      parsed: (type: string) => `Source type: ${type}`,
      parseFailed: 'Failed to parse source',
      detectingType: 'Detecting plugin type...',
      detectedType: (type: string) => `Detected type: ${type}`,
      defaultType: 'Using default type: skill',
      installing: 'Installing...',
      previewInstall: 'Previewing installation...',
      installSuccess: 'Installation successful',
      previewSuccess: 'Preview complete',
      installFailed: 'Installation failed',
      error: 'Error',
      installed: 'Plugin installed',
      preview: 'Installation preview (dry-run)',
      name: 'Name',
      version: 'Version',
      type: 'Type',
      path: 'Path',
      source: 'Source',
      target: 'Target',
      files: 'Files',
      nextSteps: 'Next steps:',
      skillHint: 'Use /skill-name in Claude Code to invoke',
      mcpHint: 'Run ccjk mcp status to check status',
      agentHint: 'Use ccjk agent list to see installed agents',
      hookHint: 'Run ccjk hooks list to see installed hooks',
      dryRunNote: 'This is preview mode, nothing was installed. Remove --dry-run to install.',
      andMore: (n: number) => `and ${n} more files`,
    },
  }
  return texts[lang]
}

export { parseSource, type SourceInfo } from './source-parser'
export { type PluginType } from './type-detector'
