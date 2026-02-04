/**
 * npm Installer
 *
 * 从 npm 安装插件
 */

import type { AddResult } from './index'
import type { NpmSourceInfo } from './source-parser'
import type { PluginType } from './type-detector'
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { getInstallPath } from './utils'

const execAsync = promisify(exec)

export interface InstallOptions {
  force?: boolean
  dryRun?: boolean
}

/**
 * 从 npm 安装插件
 */
export async function installFromNpm(
  sourceInfo: NpmSourceInfo,
  pluginType: PluginType,
  options: InstallOptions = {},
): Promise<AddResult> {
  const { force = false, dryRun = false } = options
  const { packageName, version } = sourceInfo

  try {
    // 1. 获取包信息
    const packageInfo = await fetchPackageInfo(packageName, version)
    const packageVersion = version || packageInfo.version
    const shortName = getShortName(packageName)

    // 2. 确定安装路径
    const installPath = getInstallPath(pluginType, shortName)

    // 3. 检查是否已存在
    if (!force) {
      try {
        await fs.access(installPath)
        return {
          success: false,
          source: packageName,
          sourceType: 'npm',
          pluginType,
          error: `Plugin already exists at ${installPath}. Use --force to overwrite.`,
        }
      }
      catch {
        // 不存在，继续安装
      }
    }

    // 4. 预览或安装
    if (dryRun) {
      // 预览模式
      const files = packageInfo.files || ['(package files)']
      return {
        success: true,
        source: packageName,
        sourceType: 'npm',
        pluginType,
        installedPath: installPath,
        details: {
          name: packageName,
          version: packageVersion,
          description: packageInfo.description,
          files,
        },
      }
    }

    // 实际安装
    // 对于 MCP 服务器，使用 npm install
    // 对于其他类型，下载并复制文件
    if (pluginType === 'mcp') {
      await installMcpPackage(packageName, packageVersion, installPath)
    }
    else {
      await installGenericPackage(packageName, packageVersion, installPath)
    }

    // 获取安装的文件列表
    const installedFiles = await listInstalledFiles(installPath)

    return {
      success: true,
      source: packageName,
      sourceType: 'npm',
      pluginType,
      installedPath: installPath,
      details: {
        name: packageName,
        version: packageVersion,
        description: packageInfo.description,
        files: installedFiles,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      source: packageName,
      sourceType: 'npm',
      pluginType,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 获取包信息
 */
async function fetchPackageInfo(
  packageName: string,
  version?: string,
): Promise<{ version: string, description?: string, files?: string[] }> {
  const url = version
    ? `https://registry.npmjs.org/${packageName}/${version}`
    : `https://registry.npmjs.org/${packageName}/latest`

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Package not found: ${packageName}`)
    }
    throw new Error(`Failed to fetch package info: ${response.statusText}`)
  }

  const data = await response.json() as { version: string, description?: string, files?: string[] }
  return {
    version: data.version,
    description: data.description,
    files: data.files,
  }
}

/**
 * 获取包的短名称（去除 scope）
 */
function getShortName(packageName: string): string {
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/')
    return parts[1] || packageName
  }
  return packageName
}

/**
 * 安装 MCP 包（使用 npm install）
 */
async function installMcpPackage(
  packageName: string,
  version: string,
  installPath: string,
): Promise<void> {
  // 确保目录存在
  await fs.mkdir(installPath, { recursive: true })

  // 创建 package.json
  const packageJson = {
    name: `ccjk-mcp-${getShortName(packageName)}`,
    version: '1.0.0',
    private: true,
    dependencies: {
      [packageName]: version,
    },
  }

  await fs.writeFile(
    path.join(installPath, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  )

  // 运行 npm install
  try {
    await execAsync('npm install', { cwd: installPath })
  }
  catch (error) {
    // 尝试使用 pnpm
    try {
      await execAsync('pnpm install', { cwd: installPath })
    }
    catch {
      throw new Error(
        `Failed to install package. Original error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

/**
 * 安装通用包（下载 tarball）
 */
async function installGenericPackage(
  packageName: string,
  version: string,
  installPath: string,
): Promise<void> {
  // 获取 tarball URL
  const registryUrl = `https://registry.npmjs.org/${packageName}/${version}`
  const response = await fetch(registryUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch package info: ${response.statusText}`)
  }

  const data = await response.json() as { dist?: { tarball?: string } }
  const tarballUrl = data.dist?.tarball

  if (!tarballUrl) {
    throw new Error('Failed to get tarball URL')
  }

  // 下载并解压 tarball
  const tarballResponse = await fetch(tarballUrl)
  if (!tarballResponse.ok) {
    throw new Error(`Failed to download tarball: ${tarballResponse.statusText}`)
  }

  // 确保目录存在
  await fs.mkdir(installPath, { recursive: true })

  // 使用 tar 解压
  const tarballBuffer = Buffer.from(await tarballResponse.arrayBuffer())
  const tarballPath = path.join(installPath, 'package.tgz')
  await fs.writeFile(tarballPath, tarballBuffer)

  try {
    await execAsync(`tar -xzf package.tgz --strip-components=1`, { cwd: installPath })
  }
  finally {
    // 清理 tarball
    await fs.unlink(tarballPath).catch(() => {})
  }
}

/**
 * 列出已安装的文件
 */
async function listInstalledFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string, prefix: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        // 跳过 node_modules
        if (entry.name === 'node_modules')
          continue

        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          await walk(path.join(currentDir, entry.name), relativePath)
        }
        else {
          files.push(relativePath)
        }
      }
    }
    catch {
      // 忽略读取错误
    }
  }

  await walk(dir)
  return files
}
