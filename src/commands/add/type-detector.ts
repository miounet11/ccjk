/**
 * Plugin Type Detector
 *
 * 自动检测插件类型，基于：
 * - 文件名模式
 * - 目录结构
 * - 配置文件内容
 * - package.json 字段
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { SourceInfo, GitHubSourceInfo, LocalSourceInfo } from './source-parser'
import { buildGitHubRawUrl } from './source-parser'

export type PluginType = 'skill' | 'mcp' | 'agent' | 'hook'

export interface DetectionResult {
  type: PluginType
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * 检测插件类型
 */
export async function detectPluginType(sourceInfo: SourceInfo): Promise<PluginType> {
  const result = await detectPluginTypeWithConfidence(sourceInfo)
  return result.type
}

/**
 * 检测插件类型（带置信度）
 */
export async function detectPluginTypeWithConfidence(
  sourceInfo: SourceInfo,
): Promise<DetectionResult> {
  switch (sourceInfo.type) {
    case 'github':
      return detectFromGitHub(sourceInfo)
    case 'npm':
      return detectFromNpm(sourceInfo)
    case 'local':
      return detectFromLocal(sourceInfo)
    default:
      return { type: 'skill', confidence: 'low', reason: 'Unknown source type' }
  }
}

/**
 * 从 GitHub 仓库检测
 */
async function detectFromGitHub(info: GitHubSourceInfo): Promise<DetectionResult> {
  // 1. 检查仓库名称模式
  const repoNameResult = detectFromRepoName(info.repo)
  if (repoNameResult.confidence === 'high') {
    return repoNameResult
  }

  // 2. 尝试获取 package.json
  try {
    const packageJsonUrl = buildGitHubRawUrl(info, 'package.json')
    const response = await fetch(packageJsonUrl)
    if (response.ok) {
      const packageJson = await response.json() as Record<string, unknown>
      const pkgResult = detectFromPackageJson(packageJson)
      if (pkgResult.confidence !== 'low') {
        return pkgResult
      }
    }
  }
  catch {
    // 忽略获取失败
  }

  // 3. 尝试检查特征文件
  const filePatterns = [
    { file: 'SKILL.md', type: 'skill' as PluginType },
    { file: 'skill.md', type: 'skill' as PluginType },
    { file: 'AGENT.md', type: 'agent' as PluginType },
    { file: 'agent.md', type: 'agent' as PluginType },
    { file: 'mcp.json', type: 'mcp' as PluginType },
    { file: 'hook.json', type: 'hook' as PluginType },
  ]

  for (const pattern of filePatterns) {
    try {
      const fileUrl = buildGitHubRawUrl(info, pattern.file)
      const response = await fetch(fileUrl, { method: 'HEAD' })
      if (response.ok) {
        return {
          type: pattern.type,
          confidence: 'high',
          reason: `Found ${pattern.file}`,
        }
      }
    }
    catch {
      // 继续检查下一个
    }
  }

  // 4. 返回基于仓库名的结果或默认值
  return repoNameResult.confidence !== 'low'
    ? repoNameResult
    : { type: 'skill', confidence: 'low', reason: 'Default type' }
}

/**
 * 从 npm 包检测
 */
async function detectFromNpm(info: { packageName: string }): Promise<DetectionResult> {
  // 1. 检查包名模式
  const nameResult = detectFromPackageName(info.packageName)
  if (nameResult.confidence === 'high') {
    return nameResult
  }

  // 2. 尝试获取 npm registry 信息
  try {
    const registryUrl = `https://registry.npmjs.org/${info.packageName}`
    const response = await fetch(registryUrl)
    if (response.ok) {
      const data = await response.json() as { 'dist-tags'?: { latest?: string }; versions?: Record<string, Record<string, unknown>> }
      const latestVersion = data['dist-tags']?.latest
      if (latestVersion && data.versions?.[latestVersion]) {
        const packageJson = data.versions[latestVersion]
        const pkgResult = detectFromPackageJson(packageJson)
        if (pkgResult.confidence !== 'low') {
          return pkgResult
        }
      }
    }
  }
  catch {
    // 忽略获取失败
  }

  return nameResult.confidence !== 'low'
    ? nameResult
    : { type: 'skill', confidence: 'low', reason: 'Default type' }
}

/**
 * 从本地路径检测
 */
async function detectFromLocal(info: LocalSourceInfo): Promise<DetectionResult> {
  const { absolutePath } = info

  // 1. 检查目录名
  const dirName = path.basename(absolutePath)
  const dirResult = detectFromRepoName(dirName)
  if (dirResult.confidence === 'high') {
    return dirResult
  }

  // 2. 检查 package.json
  try {
    const packageJsonPath = path.join(absolutePath, 'package.json')
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)
    const pkgResult = detectFromPackageJson(packageJson)
    if (pkgResult.confidence !== 'low') {
      return pkgResult
    }
  }
  catch {
    // 忽略读取失败
  }

  // 3. 检查特征文件
  const filePatterns = [
    { file: 'SKILL.md', type: 'skill' as PluginType },
    { file: 'skill.md', type: 'skill' as PluginType },
    { file: 'AGENT.md', type: 'agent' as PluginType },
    { file: 'agent.md', type: 'agent' as PluginType },
    { file: 'mcp.json', type: 'mcp' as PluginType },
    { file: 'hook.json', type: 'hook' as PluginType },
  ]

  for (const pattern of filePatterns) {
    try {
      const filePath = path.join(absolutePath, pattern.file)
      await fs.access(filePath)
      return {
        type: pattern.type,
        confidence: 'high',
        reason: `Found ${pattern.file}`,
      }
    }
    catch {
      // 继续检查下一个
    }
  }

  // 4. 检查是否是单个 .md 文件（skill）
  try {
    const stat = await fs.stat(absolutePath)
    if (stat.isFile() && absolutePath.endsWith('.md')) {
      return {
        type: 'skill',
        confidence: 'high',
        reason: 'Single markdown file',
      }
    }
  }
  catch {
    // 忽略
  }

  return dirResult.confidence !== 'low'
    ? dirResult
    : { type: 'skill', confidence: 'low', reason: 'Default type' }
}

/**
 * 从仓库/目录名检测
 */
function detectFromRepoName(name: string): DetectionResult {
  const lowerName = name.toLowerCase()

  // MCP 服务器模式
  if (
    lowerName.includes('mcp-server') ||
    lowerName.includes('mcp_server') ||
    lowerName.startsWith('mcp-') ||
    lowerName.endsWith('-mcp')
  ) {
    return { type: 'mcp', confidence: 'high', reason: `Name contains MCP pattern: ${name}` }
  }

  // Agent 模式
  if (
    lowerName.includes('agent') ||
    lowerName.includes('-agent') ||
    lowerName.endsWith('-agent')
  ) {
    return { type: 'agent', confidence: 'medium', reason: `Name contains agent pattern: ${name}` }
  }

  // Hook 模式
  if (
    lowerName.includes('hook') ||
    lowerName.includes('-hook') ||
    lowerName.endsWith('-hook')
  ) {
    return { type: 'hook', confidence: 'medium', reason: `Name contains hook pattern: ${name}` }
  }

  // Skill 模式
  if (
    lowerName.includes('skill') ||
    lowerName.includes('-skill') ||
    lowerName.endsWith('-skill')
  ) {
    return { type: 'skill', confidence: 'medium', reason: `Name contains skill pattern: ${name}` }
  }

  return { type: 'skill', confidence: 'low', reason: 'No pattern matched' }
}

/**
 * 从包名检测
 */
function detectFromPackageName(packageName: string): DetectionResult {
  const lowerName = packageName.toLowerCase()

  // @modelcontextprotocol 作用域
  if (lowerName.startsWith('@modelcontextprotocol/')) {
    return { type: 'mcp', confidence: 'high', reason: 'MCP official scope' }
  }

  // 其他 MCP 模式
  if (lowerName.includes('mcp-server') || lowerName.includes('mcp_server')) {
    return { type: 'mcp', confidence: 'high', reason: 'MCP server pattern in name' }
  }

  return detectFromRepoName(packageName)
}

/**
 * 从 package.json 检测
 */
function detectFromPackageJson(packageJson: Record<string, unknown>): DetectionResult {
  // 1. 检查 ccjk 字段
  if (packageJson.ccjk && typeof packageJson.ccjk === 'object') {
    const ccjk = packageJson.ccjk as Record<string, unknown>
    if (ccjk.type && typeof ccjk.type === 'string') {
      const type = ccjk.type as PluginType
      if (['skill', 'mcp', 'agent', 'hook'].includes(type)) {
        return { type, confidence: 'high', reason: 'Explicit ccjk.type field' }
      }
    }
  }

  // 2. 检查 keywords
  if (Array.isArray(packageJson.keywords)) {
    const keywords = packageJson.keywords as string[]
    const keywordMap: Record<string, PluginType> = {
      'mcp-server': 'mcp',
      mcp: 'mcp',
      'model-context-protocol': 'mcp',
      'ccjk-skill': 'skill',
      'claude-skill': 'skill',
      'ccjk-agent': 'agent',
      'ccjk-hook': 'hook',
    }

    for (const keyword of keywords) {
      const type = keywordMap[keyword.toLowerCase()]
      if (type) {
        return { type, confidence: 'high', reason: `Keyword: ${keyword}` }
      }
    }
  }

  // 3. 检查 bin 字段（MCP 服务器通常有 bin）
  if (packageJson.bin) {
    const binKeys = Object.keys(packageJson.bin as Record<string, string>)
    for (const key of binKeys) {
      if (key.includes('mcp') || key.includes('server')) {
        return { type: 'mcp', confidence: 'medium', reason: `Binary name: ${key}` }
      }
    }
  }

  // 4. 检查 main 字段
  if (typeof packageJson.main === 'string') {
    const main = packageJson.main.toLowerCase()
    if (main.includes('server') || main.includes('mcp')) {
      return { type: 'mcp', confidence: 'low', reason: `Main file: ${packageJson.main}` }
    }
  }

  return { type: 'skill', confidence: 'low', reason: 'No specific indicators' }
}
