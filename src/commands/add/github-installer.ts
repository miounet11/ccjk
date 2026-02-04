/**
 * GitHub Installer
 *
 * 从 GitHub 仓库安装插件
 */

import type { AddResult } from './index'
import type { GitHubSourceInfo } from './source-parser'
import type { PluginType } from './type-detector'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { copyDirectory, downloadFile, getInstallPath } from './utils'

export interface InstallOptions {
  force?: boolean
  dryRun?: boolean
}

/**
 * 从 GitHub 安装插件
 */
export async function installFromGitHub(
  sourceInfo: GitHubSourceInfo,
  pluginType: PluginType,
  options: InstallOptions = {},
): Promise<AddResult> {
  const { force = false, dryRun = false } = options
  const { owner, repo, ref = 'main', subpath } = sourceInfo

  try {
    // 1. 获取仓库信息
    const repoInfo = await fetchRepoInfo(owner, repo)
    const defaultBranch = repoInfo.default_branch || 'main'
    const actualRef = ref || defaultBranch

    // 2. 确定安装路径
    const installPath = getInstallPath(pluginType, repo)

    // 3. 检查是否已存在
    if (!force) {
      try {
        await fs.access(installPath)
        return {
          success: false,
          source: sourceInfo.originalUrl,
          sourceType: 'github',
          pluginType,
          error: `Plugin already exists at ${installPath}. Use --force to overwrite.`,
        }
      }
      catch {
        // 不存在，继续安装
      }
    }

    // 4. 下载并安装
    if (dryRun) {
      // 预览模式：获取文件列表
      const files = await listRepoFiles(owner, repo, actualRef, subpath)
      return {
        success: true,
        source: sourceInfo.originalUrl,
        sourceType: 'github',
        pluginType,
        installedPath: installPath,
        details: {
          name: repo,
          version: actualRef,
          description: repoInfo.description || undefined,
          files: files.slice(0, 20),
        },
      }
    }

    // 实际安装
    const tempDir = await downloadRepo(owner, repo, actualRef)
    const sourcePath = subpath ? path.join(tempDir, subpath) : tempDir

    // 确保目标目录存在
    await fs.mkdir(path.dirname(installPath), { recursive: true })

    // 复制文件
    await copyDirectory(sourcePath, installPath)

    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true })

    // 获取安装的文件列表
    const installedFiles = await listInstalledFiles(installPath)

    return {
      success: true,
      source: sourceInfo.originalUrl,
      sourceType: 'github',
      pluginType,
      installedPath: installPath,
      details: {
        name: repo,
        version: actualRef,
        description: repoInfo.description || undefined,
        files: installedFiles,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      source: sourceInfo.originalUrl,
      sourceType: 'github',
      pluginType,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 获取仓库信息
 */
async function fetchRepoInfo(
  owner: string,
  repo: string,
): Promise<{ default_branch?: string, description?: string }> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ccjk-cli',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`)
    }
    throw new Error(`Failed to fetch repository info: ${response.statusText}`)
  }

  return response.json() as Promise<{ default_branch?: string, description?: string }>
}

/**
 * 列出仓库文件
 */
async function listRepoFiles(
  owner: string,
  repo: string,
  ref: string,
  subpath?: string,
): Promise<string[]> {
  const treePath = subpath || ''
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ccjk-cli',
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json() as { tree?: Array<{ path: string, type: string }> }
  const files = (data.tree || [])
    .filter(item => item.type === 'blob')
    .map(item => item.path)
    .filter(filePath => !treePath || filePath.startsWith(treePath))

  return files
}

/**
 * 下载仓库到临时目录
 */
async function downloadRepo(
  owner: string,
  repo: string,
  ref: string,
): Promise<string> {
  const zipUrl = `https://github.com/${owner}/${repo}/archive/${ref}.zip`
  const tempDir = path.join(os.tmpdir(), `ccjk-${repo}-${Date.now()}`)
  const zipPath = path.join(tempDir, 'repo.zip')

  // 创建临时目录
  await fs.mkdir(tempDir, { recursive: true })

  // 下载 zip 文件
  await downloadFile(zipUrl, zipPath)

  // 解压
  const extractedDir = await extractZip(zipPath, tempDir)

  // 删除 zip 文件
  await fs.unlink(zipPath)

  return extractedDir
}

/**
 * 解压 zip 文件
 */
async function extractZip(zipPath: string, destDir: string): Promise<string> {
  // 使用 unzip 命令（跨平台兼容性较好）
  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(exec)

  try {
    await execAsync(`unzip -q "${zipPath}" -d "${destDir}"`)
  }
  catch {
    // 尝试使用 tar（某些系统可能没有 unzip）
    try {
      await execAsync(`tar -xf "${zipPath}" -C "${destDir}"`)
    }
    catch {
      throw new Error('Failed to extract archive. Please ensure unzip or tar is installed.')
    }
  }

  // 找到解压后的目录（GitHub zip 会创建 repo-ref 目录）
  const entries = await fs.readdir(destDir)
  const extractedDir = entries.find(entry => !entry.endsWith('.zip'))

  if (!extractedDir) {
    throw new Error('Failed to find extracted directory')
  }

  return path.join(destDir, extractedDir)
}

/**
 * 列出已安装的文件
 */
async function listInstalledFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
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
