/**
 * Smart Path Resolver - 智能路径解析
 * 解决: Path resolution issues
 */

import type { PathOptions, PathResult } from './types'
import { existsSync } from 'node:fs'
import { lstat, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { sep as nodeSep } from 'node:path'
import { isAbsolute, normalize, resolve, sep } from 'pathe'

export class SmartPathResolver {
  /**
   * 智能解析路径
   */
  async resolve(inputPath: string, options?: PathOptions): Promise<PathResult> {
    try {
      // Step 1: 规范化路径
      let normalizedPath = this.normalizePath(inputPath)

      // Step 2: 解析相对路径
      if (!isAbsolute(normalizedPath)) {
        normalizedPath = resolve(options?.basePath || process.cwd(), normalizedPath)
      }

      // Step 3: 解析符号链接
      let resolvedPath = normalizedPath
      if (options?.resolveSymlinks !== false) {
        try {
          resolvedPath = await realpath(normalizedPath)
        }
        catch {
          // 文件可能不存在，使用规范化路径
          resolvedPath = normalizedPath
        }
      }

      // Step 4: 验证路径
      const validation = await this.validatePath(resolvedPath)

      return {
        path: resolvedPath,
        valid: validation.valid,
        exists: validation.exists,
        type: validation.type,
        permissions: validation.permissions,
      }
    }
    catch (error: any) {
      return {
        path: inputPath,
        valid: false,
        exists: false,
        type: 'unknown',
      }
    }
  }

  /**
   * 规范化路径
   */
  private normalizePath(inputPath: string): string {
    let normalized = inputPath.trim()

    // 处理空路径
    if (!normalized) {
      normalized = process.cwd()
    }

    // 处理 Windows 路径分隔符
    normalized = normalized.replace(/\\/g, '/')

    // 处理 ~ (home directory)
    if (normalized.startsWith('~')) {
      normalized = normalized.replace(/^~(~|$)/, (_, rest) => {
        return rest ? homedir() + rest : homedir()
      })
    }

    // 处理环境变量
    normalized = this.expandEnvironmentVariables(normalized)

    // 移除多余的斜杠
    normalized = normalized.replace(/\/+/g, '/')

    // 处理 . 和 ..
    normalized = normalize(normalized)

    // 确保路径分隔符一致
    if (nodeSep === '\\') {
      normalized = normalized.replace(/\//g, '\\')
    }

    return normalized
  }

  /**
   * 展开环境变量
   */
  private expandEnvironmentVariables(path: string): string {
    return path.replace(/\$([A-Z_]\w*)/gi, (_, name) => {
      return process.env[name] || ''
    })
  }

  /**
   * 验证路径
   */
  private async validatePath(filePath: string): Promise<{
    valid: boolean
    exists: boolean
    type?: 'file' | 'directory' | 'symlink' | 'unknown'
    permissions?: {
      readable: boolean
      writable: boolean
      executable: boolean
    }
  }> {
    // 检查路径是否存在
    const exists = existsSync(filePath)

    if (!exists) {
      return {
        valid: this.isValidPathFormat(filePath),
        exists: false,
        type: 'unknown',
      }
    }

    // 获取路径类型和权限
    try {
      const stats = await lstat(filePath)

      let type: 'file' | 'directory' | 'symlink' | 'unknown' = 'unknown'
      if (stats.isFile()) {
        type = 'file'
      }
      else if (stats.isDirectory()) {
        type = 'directory'
      }
      else if (stats.isSymbolicLink()) {
        type = 'symlink'
      }

      // 检查权限
      const permissions = {
        readable: !!(stats.mode & 0o444),
        writable: !!(stats.mode & 0o222),
        executable: !!(stats.mode & 0o111),
      }

      return {
        valid: true,
        exists: true,
        type,
        permissions,
      }
    }
    catch {
      return {
        valid: true,
        exists: true,
        type: 'unknown',
      }
    }
  }

  /**
   * 检查路径格式是否有效
   */
  private isValidPathFormat(path: string): boolean {
    // 检查非法字符
    const illegalChars = process.platform === 'win32'
      ? /[<>:"|?*\x00-\x1F]/
      : /\0/

    if (illegalChars.test(path)) {
      return false
    }

    // Windows 驱动器字母检查
    if (process.platform === 'win32') {
      // 检查驱动器字母格式 (如 C:, D:)
      const driveLetterPattern = /^[a-z]:\\/i
      if (path.includes(':') && !driveLetterPattern.test(path)) {
        return false
      }
    }

    // 检查路径长度
    const maxLength = process.platform === 'win32' ? 260 : 4096
    if (path.length > maxLength) {
      return false
    }

    return true
  }

  /**
   * 获取相对路径
   */
  relative(from: string, to: string): string {
    const absFrom = resolve(from)
    const absTo = resolve(to)

    // 简单的相对路径计算
    const fromParts = absFrom.split(sep).filter(Boolean)
    const toParts = absTo.split(sep).filter(Boolean)

    // 找到公共前缀
    let commonLength = 0
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++
      }
      else {
        break
      }
    }

    // 构建相对路径
    const upCount = fromParts.length - commonLength
    const downParts = toParts.slice(commonLength)

    const relativeParts = [
      ...new Array(upCount).fill('..'),
      ...downParts,
    ]

    return relativeParts.join('/') || '.'
  }

  /**
   * 路径拼接
   */
  join(...paths: string[]): string {
    return normalize(paths.join('/'))
  }

  /**
   * 获取目录名
   */
  dirname(filePath: string): string {
    const parts = filePath.split(sep).filter(Boolean)
    parts.pop()
    return parts.length > 0 ? parts.join(sep) : sep
  }

  /**
   * 获取文件名
   */
  basename(filePath: string, ext?: string): string {
    const parts = filePath.split(sep)
    let name = parts[parts.length - 1] || ''

    if (ext && name.endsWith(ext)) {
      name = name.slice(0, -ext.length)
    }

    return name
  }

  /**
   * 获取扩展名
   */
  extname(filePath: string): string {
    const parts = filePath.split('.')
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
  }

  /**
   * 检查是否为绝对路径
   */
  isAbsolute(path: string): boolean {
    return isAbsolute(path)
  }

  /**
   * 转换为跨平台路径
   */
  toPlatformPath(path: string): string {
    let normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/')

    if (nodeSep === '\\') {
      normalized = normalized.replace(/\//g, '\\')
    }

    return normalized
  }

  /**
   * 建议路径修正
   */
  suggestFix(inputPath: string, error?: string): string[] {
    const suggestions: string[] = []

    // 空路径
    if (!inputPath.trim()) {
      suggestions.push('Use current directory: .')
      suggestions.push('Use home directory: ~')
      return suggestions
    }

    // 路径不存在
    if (!existsSync(inputPath)) {
      const dir = this.dirname(inputPath)
      if (existsSync(dir)) {
        // 目录存在，文件不存在
        const basename = this.basename(inputPath)
        suggestions.push(`File '${basename}' does not exist in '${dir}'`)
      }
      else {
        // 目录不存在
        suggestions.push(`Directory '${dir}' does not exist`)
        suggestions.push(`Create directory: mkdir -p "${dir}"`)
      }

      // 检查大小写
      if (process.platform === 'linux' || process.platform === 'darwin') {
        suggestions.push('Check case sensitivity (Linux/macOS paths are case-sensitive)')
      }
    }

    // 权限错误
    if (error?.includes('permission') || error?.includes('EACCES')) {
      suggestions.push('Check file permissions')
      suggestions.push('Try with sudo/admin privileges if appropriate')
    }

    // 路径太长
    if (inputPath.length > 200) {
      suggestions.push('Path is very long. Consider using relative paths or symlinks')
    }

    // 特殊字符
    const specialChars = /[<>:"|?*\x00-\x1F]/
    if (specialChars.test(inputPath)) {
      suggestions.push('Path contains special characters that may not be supported')
    }

    return suggestions
  }
}
