/**
 * Add Command Utilities
 *
 * 共享的工具函数
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import type { PluginType } from './type-detector'

/**
 * 获取 CCJK 配置目录
 */
export function getCcjkConfigDir(): string {
  // 优先使用环境变量
  if (process.env.CCJK_CONFIG_DIR) {
    return process.env.CCJK_CONFIG_DIR
  }

  // 默认使用 ~/.ccjk
  return path.join(os.homedir(), '.ccjk')
}

/**
 * 获取插件安装路径
 */
export function getInstallPath(pluginType: PluginType, name: string): string {
  const configDir = getCcjkConfigDir()

  // 根据插件类型确定子目录
  const typeDir = {
    skill: 'skills',
    mcp: 'mcp-servers',
    agent: 'agents',
    hook: 'hooks',
  }[pluginType]

  return path.join(configDir, typeDir, name)
}

/**
 * 获取所有插件类型的目录
 */
export function getPluginDirs(): Record<PluginType, string> {
  const configDir = getCcjkConfigDir()
  return {
    skill: path.join(configDir, 'skills'),
    mcp: path.join(configDir, 'mcp-servers'),
    agent: path.join(configDir, 'agents'),
    hook: path.join(configDir, 'hooks'),
  }
}

/**
 * 复制目录
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  // 确保目标目录存在
  await fs.mkdir(dest, { recursive: true })

  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    }
    else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

/**
 * 下载文件
 */
export async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ccjk-cli',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(destPath, buffer)
}

/**
 * 确保目录存在
 */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

/**
 * 检查路径是否存在
 */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  }
  catch {
    return false
  }
}

/**
 * 安全删除目录
 */
export async function safeRemoveDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  }
  catch {
    // 忽略删除失败
  }
}

/**
 * 读取 JSON 文件
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  }
  catch {
    return null
  }
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

/**
 * 获取文件扩展名（小写）
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

/**
 * 判断是否是 Markdown 文件
 */
export function isMarkdownFile(filePath: string): boolean {
  const ext = getExtension(filePath)
  return ext === '.md' || ext === '.markdown'
}

/**
 * 判断是否是 JSON 文件
 */
export function isJsonFile(filePath: string): boolean {
  return getExtension(filePath) === '.json'
}

/**
 * 判断是否是 JavaScript/TypeScript 文件
 */
export function isJsFile(filePath: string): boolean {
  const ext = getExtension(filePath)
  return ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'].includes(ext)
}

/**
 * 规范化插件名称
 */
export function normalizePluginName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 生成唯一的临时目录路径
 */
export function getTempDir(prefix: string = 'ccjk'): string {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}
