/**
 * Source Parser
 *
 * 解析插件来源，支持多种格式：
 * - GitHub: github:owner/repo, gh:owner/repo, https://github.com/owner/repo
 * - npm: @scope/package, package-name, npm:package-name
 * - Local: ./path, ../path, /absolute/path, ~/path
 */

import path from 'node:path'
import os from 'node:os'

export type SourceType = 'github' | 'npm' | 'local'

export interface GitHubSourceInfo {
  type: 'github'
  owner: string
  repo: string
  ref?: string // branch, tag, or commit
  subpath?: string // path within repo
  originalUrl: string
}

export interface NpmSourceInfo {
  type: 'npm'
  packageName: string
  version?: string
  scope?: string
}

export interface LocalSourceInfo {
  type: 'local'
  absolutePath: string
  originalPath: string
}

export type SourceInfo = GitHubSourceInfo | NpmSourceInfo | LocalSourceInfo

/**
 * 解析来源字符串
 */
export function parseSource(source: string): SourceInfo {
  const trimmed = source.trim()

  // 1. 检查是否是 GitHub 来源
  const githubInfo = parseGitHubSource(trimmed)
  if (githubInfo) {
    return githubInfo
  }

  // 2. 检查是否是本地路径
  const localInfo = parseLocalSource(trimmed)
  if (localInfo) {
    return localInfo
  }

  // 3. 默认作为 npm 包处理
  return parseNpmSource(trimmed)
}

/**
 * 解析 GitHub 来源
 */
function parseGitHubSource(source: string): GitHubSourceInfo | null {
  // 格式: github:owner/repo, gh:owner/repo
  const prefixMatch = source.match(/^(?:github|gh):([^/]+)\/([^#@/]+)(?:#(.+))?$/)
  if (prefixMatch) {
    return {
      type: 'github',
      owner: prefixMatch[1],
      repo: prefixMatch[2],
      ref: prefixMatch[3],
      originalUrl: source,
    }
  }

  // 格式: https://github.com/owner/repo
  const urlMatch = source.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?(?:\/(.+))?$/,
  )
  if (urlMatch) {
    return {
      type: 'github',
      owner: urlMatch[1],
      repo: urlMatch[2],
      ref: urlMatch[3],
      subpath: urlMatch[4],
      originalUrl: source,
    }
  }

  // 格式: owner/repo (简写，需要确认不是本地路径)
  const shortMatch = source.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:#(.+))?$/)
  if (shortMatch && !source.startsWith('.') && !source.startsWith('/') && !source.startsWith('~')) {
    return {
      type: 'github',
      owner: shortMatch[1],
      repo: shortMatch[2],
      ref: shortMatch[3],
      originalUrl: source,
    }
  }

  return null
}

/**
 * 解析本地路径
 */
function parseLocalSource(source: string): LocalSourceInfo | null {
  // 检查是否是本地路径特征
  if (
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('/') ||
    source.startsWith('~/')
  ) {
    let absolutePath: string

    if (source.startsWith('~/')) {
      absolutePath = path.join(os.homedir(), source.slice(2))
    }
    else if (path.isAbsolute(source)) {
      absolutePath = source
    }
    else {
      absolutePath = path.resolve(process.cwd(), source)
    }

    return {
      type: 'local',
      absolutePath,
      originalPath: source,
    }
  }

  // 检查是否是 Windows 绝对路径 (C:\path)
  if (/^[a-zA-Z]:[\\/]/.test(source)) {
    return {
      type: 'local',
      absolutePath: path.resolve(source),
      originalPath: source,
    }
  }

  return null
}

/**
 * 解析 npm 包
 */
function parseNpmSource(source: string): NpmSourceInfo {
  // 格式: npm:package-name, npm:@scope/package
  const npmPrefixMatch = source.match(/^npm:(.+)$/)
  const packageStr = npmPrefixMatch ? npmPrefixMatch[1] : source

  // 格式: @scope/package@version
  const scopedMatch = packageStr.match(/^(@[^/]+)\/([^@]+)(?:@(.+))?$/)
  if (scopedMatch) {
    return {
      type: 'npm',
      scope: scopedMatch[1],
      packageName: `${scopedMatch[1]}/${scopedMatch[2]}`,
      version: scopedMatch[3],
    }
  }

  // 格式: package@version
  const versionMatch = packageStr.match(/^([^@]+)@(.+)$/)
  if (versionMatch) {
    return {
      type: 'npm',
      packageName: versionMatch[1],
      version: versionMatch[2],
    }
  }

  // 格式: package-name
  return {
    type: 'npm',
    packageName: packageStr,
  }
}

/**
 * 验证 GitHub 仓库格式
 */
export function isValidGitHubRepo(owner: string, repo: string): boolean {
  const ownerRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/
  const repoRegex = /^[a-zA-Z0-9._-]+$/
  return ownerRegex.test(owner) && repoRegex.test(repo)
}

/**
 * 验证 npm 包名格式
 */
export function isValidNpmPackage(packageName: string): boolean {
  // npm 包名规则
  const npmRegex = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  return npmRegex.test(packageName)
}

/**
 * 构建 GitHub 仓库 URL
 */
export function buildGitHubUrl(info: GitHubSourceInfo): string {
  let url = `https://github.com/${info.owner}/${info.repo}`
  if (info.ref) {
    url += `/tree/${info.ref}`
  }
  if (info.subpath) {
    url += `/${info.subpath}`
  }
  return url
}

/**
 * 构建 GitHub API URL
 */
export function buildGitHubApiUrl(info: GitHubSourceInfo): string {
  return `https://api.github.com/repos/${info.owner}/${info.repo}`
}

/**
 * 构建 GitHub 原始文件 URL
 */
export function buildGitHubRawUrl(
  info: GitHubSourceInfo,
  filePath: string,
): string {
  const ref = info.ref || 'main'
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${ref}/${filePath}`
}
