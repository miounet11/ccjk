/**
 * 项目信息检测器
 *
 * 按需分析当前项目的类型、语言、配置等信息
 */

import type { ProjectInfo } from '../types.js'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'pathe'

/**
 * 检测项目信息
 */
export async function detectProjectInfo(cwd: string = process.cwd()): Promise<ProjectInfo> {
  const projectName = basename(cwd)
  let projectType: string | undefined
  let language: string | undefined
  let skillsCount = 0
  let mcpCount = 0
  let agentsCount = 0

  // 检测项目类型和语言
  const detectionResult = await detectProjectType(cwd)
  projectType = detectionResult.type
  language = detectionResult.language

  // 检测 CCJK 配置
  const ccjkConfig = await detectCcjkConfig(cwd)
  skillsCount = ccjkConfig.skillsCount
  mcpCount = ccjkConfig.mcpCount
  agentsCount = ccjkConfig.agentsCount

  return {
    name: projectName,
    type: projectType,
    language,
    skillsCount,
    mcpCount,
    agentsCount,
  }
}

/**
 * 检测项目类型
 */
async function detectProjectType(cwd: string): Promise<{ type?: string, language?: string }> {
  // 检测 package.json (Node.js/JavaScript/TypeScript)
  const packageJsonPath = join(cwd, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(content)

      // 检测框架
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (deps.next)
        return { type: 'Next.js', language: 'TypeScript' }
      if (deps.nuxt)
        return { type: 'Nuxt', language: 'TypeScript' }
      if (deps.vue)
        return { type: 'Vue', language: 'TypeScript' }
      if (deps.react)
        return { type: 'React', language: 'TypeScript' }
      if (deps['@angular/core'])
        return { type: 'Angular', language: 'TypeScript' }
      if (deps.svelte)
        return { type: 'Svelte', language: 'TypeScript' }
      if (deps.express)
        return { type: 'Express', language: 'JavaScript' }
      if (deps.fastify)
        return { type: 'Fastify', language: 'TypeScript' }
      if (deps.nest)
        return { type: 'NestJS', language: 'TypeScript' }
      if (deps.electron)
        return { type: 'Electron', language: 'TypeScript' }
      if (deps.tauri)
        return { type: 'Tauri', language: 'TypeScript' }

      // 检测语言
      const hasTypeScript = existsSync(join(cwd, 'tsconfig.json')) || deps.typescript
      return {
        type: 'Node.js',
        language: hasTypeScript ? 'TypeScript' : 'JavaScript',
      }
    }
    catch {
      // 忽略解析错误
    }
  }

  // 检测 Cargo.toml (Rust)
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    return { type: 'Rust', language: 'Rust' }
  }

  // 检测 go.mod (Go)
  if (existsSync(join(cwd, 'go.mod'))) {
    return { type: 'Go', language: 'Go' }
  }

  // 检测 pyproject.toml 或 setup.py (Python)
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'setup.py'))) {
    return { type: 'Python', language: 'Python' }
  }

  // 检测 pom.xml (Java/Maven)
  if (existsSync(join(cwd, 'pom.xml'))) {
    return { type: 'Maven', language: 'Java' }
  }

  // 检测 build.gradle (Java/Gradle)
  if (existsSync(join(cwd, 'build.gradle')) || existsSync(join(cwd, 'build.gradle.kts'))) {
    return { type: 'Gradle', language: 'Java' }
  }

  // 检测 Gemfile (Ruby)
  if (existsSync(join(cwd, 'Gemfile'))) {
    return { type: 'Ruby', language: 'Ruby' }
  }

  // 检测 composer.json (PHP)
  if (existsSync(join(cwd, 'composer.json'))) {
    return { type: 'PHP', language: 'PHP' }
  }

  // 检测 .csproj (C#/.NET)
  const csprojFiles = await findFiles(cwd, '*.csproj')
  if (csprojFiles.length > 0) {
    return { type: '.NET', language: 'C#' }
  }

  return { type: undefined, language: undefined }
}

/**
 * 检测 CCJK 配置
 */
async function detectCcjkConfig(cwd: string): Promise<{
  skillsCount: number
  mcpCount: number
  agentsCount: number
}> {
  let skillsCount = 0
  let mcpCount = 0
  let agentsCount = 0

  // 检测 .ccjk 目录
  const ccjkDir = join(cwd, '.ccjk')
  if (existsSync(ccjkDir)) {
    // 检测 skills
    const skillsDir = join(ccjkDir, 'skills')
    if (existsSync(skillsDir)) {
      const skillFiles = await findFiles(skillsDir, '*.md')
      skillsCount = skillFiles.length
    }

    // 检测 agents
    const agentsDir = join(ccjkDir, 'agents')
    if (existsSync(agentsDir)) {
      const agentFiles = await findFiles(agentsDir, '*.md')
      agentsCount = agentFiles.length
    }
  }

  // 检测 MCP 配置
  const claudeDir = join(cwd, '.claude')
  if (existsSync(claudeDir)) {
    const mcpConfigPath = join(claudeDir, 'mcp.json')
    if (existsSync(mcpConfigPath)) {
      try {
        const content = readFileSync(mcpConfigPath, 'utf-8')
        const config = JSON.parse(content)
        mcpCount = Object.keys(config.mcpServers || {}).length
      }
      catch {
        // 忽略解析错误
      }
    }
  }

  return { skillsCount, mcpCount, agentsCount }
}

/**
 * 查找文件
 */
async function findFiles(dir: string, pattern: string): Promise<string[]> {
  try {
    const { glob } = await import('glob')
    return await glob(pattern, { cwd: dir, absolute: true })
  }
  catch {
    return []
  }
}
