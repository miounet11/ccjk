/**
 * Local Installer
 *
 * 从本地路径安装插件
 */

import type { AddResult } from './index'
import type { LocalSourceInfo } from './source-parser'
import type { PluginType } from './type-detector'
import fs from 'node:fs/promises'
import path from 'node:path'
import { copyDirectory, getInstallPath } from './utils'

export interface InstallOptions {
  force?: boolean
  dryRun?: boolean
}

/**
 * 从本地路径安装插件
 */
export async function installFromLocal(
  sourceInfo: LocalSourceInfo,
  pluginType: PluginType,
  options: InstallOptions = {},
): Promise<AddResult> {
  const { force = false, dryRun = false } = options
  const { absolutePath, originalPath } = sourceInfo

  try {
    // 1. 验证源路径存在
    const stat = await fs.stat(absolutePath)
    const isFile = stat.isFile()
    const isDirectory = stat.isDirectory()

    if (!isFile && !isDirectory) {
      return {
        success: false,
        source: originalPath,
        sourceType: 'local',
        pluginType,
        error: `Source path is neither a file nor a directory: ${absolutePath}`,
      }
    }

    // 2. 确定插件名称和安装路径
    const pluginName = path.basename(absolutePath, path.extname(absolutePath))
    const installPath = getInstallPath(pluginType, pluginName)

    // 3. 检查是否已存在
    if (!force) {
      try {
        await fs.access(installPath)
        return {
          success: false,
          source: originalPath,
          sourceType: 'local',
          pluginType,
          error: `Plugin already exists at ${installPath}. Use --force to overwrite.`,
        }
      }
      catch {
        // 不存在，继续安装
      }
    }

    // 4. 获取文件列表
    const files = isFile
      ? [path.basename(absolutePath)]
      : await listFiles(absolutePath)

    // 5. 读取插件信息
    const pluginInfo = await readPluginInfo(absolutePath, isFile)

    // 6. 预览或安装
    if (dryRun) {
      return {
        success: true,
        source: originalPath,
        sourceType: 'local',
        pluginType,
        installedPath: installPath,
        details: {
          name: pluginInfo.name || pluginName,
          version: pluginInfo.version,
          description: pluginInfo.description,
          files,
        },
      }
    }

    // 实际安装
    if (isFile) {
      // 单文件：复制到目标目录
      await fs.mkdir(path.dirname(installPath), { recursive: true })

      // 如果是 .md 文件，直接复制
      if (absolutePath.endsWith('.md')) {
        await fs.copyFile(absolutePath, installPath)
      }
      else {
        // 其他文件，创建目录并复制
        await fs.mkdir(installPath, { recursive: true })
        await fs.copyFile(
          absolutePath,
          path.join(installPath, path.basename(absolutePath)),
        )
      }
    }
    else {
      // 目录：复制整个目录
      await fs.mkdir(path.dirname(installPath), { recursive: true })
      await copyDirectory(absolutePath, installPath)
    }

    // 获取安装后的文件列表
    const installedFiles = isFile
      ? [path.basename(absolutePath)]
      : await listFiles(installPath)

    return {
      success: true,
      source: originalPath,
      sourceType: 'local',
      pluginType,
      installedPath: installPath,
      details: {
        name: pluginInfo.name || pluginName,
        version: pluginInfo.version,
        description: pluginInfo.description,
        files: installedFiles,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      source: originalPath,
      sourceType: 'local',
      pluginType,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 列出目录中的文件
 */
async function listFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      // 跳过隐藏文件和 node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }

      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(path.join(currentDir, entry.name), relativePath)
      }
      else {
        files.push(relativePath)
      }
    }
  }

  await walk(dir)
  return files
}

/**
 * 读取插件信息
 */
async function readPluginInfo(
  sourcePath: string,
  isFile: boolean,
): Promise<{ name?: string, version?: string, description?: string }> {
  if (isFile) {
    // 从文件名提取信息
    const name = path.basename(sourcePath, path.extname(sourcePath))
    return { name }
  }

  // 尝试读取 package.json
  try {
    const packageJsonPath = path.join(sourcePath, 'package.json')
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
    }
  }
  catch {
    // 忽略读取失败
  }

  // 尝试读取 SKILL.md 或其他元数据文件
  const metaFiles = ['SKILL.md', 'skill.md', 'README.md', 'readme.md']
  for (const metaFile of metaFiles) {
    try {
      const metaPath = path.join(sourcePath, metaFile)
      const content = await fs.readFile(metaPath, 'utf-8')

      // 尝试从 markdown 提取标题作为名称
      const titleMatch = content.match(/^#\s+(.+)$/m)
      if (titleMatch) {
        return { name: titleMatch[1].trim() }
      }
    }
    catch {
      // 继续尝试下一个
    }
  }

  return {}
}
