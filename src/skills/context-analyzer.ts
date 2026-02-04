/**
 * Context Analyzer - Analyze project context to recommend skills
 */

import type { CcjkSkill } from './types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'pathe'

export interface ProjectContext {
  hasGit: boolean
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasDocs: boolean
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun'
}

/**
 * Analyze project context
 */
export function analyzeProjectContext(cwd: string = process.cwd()): ProjectContext {
  const context: ProjectContext = {
    hasGit: existsSync(join(cwd, '.git')),
    languages: [],
    frameworks: [],
    hasTests: false,
    hasDocs: false,
  }

  // Detect package manager
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    context.packageManager = 'pnpm'
  }
  else if (existsSync(join(cwd, 'yarn.lock'))) {
    context.packageManager = 'yarn'
  }
  else if (existsSync(join(cwd, 'bun.lockb'))) {
    context.packageManager = 'bun'
  }
  else if (existsSync(join(cwd, 'package-lock.json'))) {
    context.packageManager = 'npm'
  }

  // Detect languages
  const files = readdirSync(cwd)
  if (files.some(f => f.endsWith('.ts') || f === 'tsconfig.json')) {
    context.languages.push('typescript')
  }
  if (files.some(f => f.endsWith('.py') || f === 'requirements.txt')) {
    context.languages.push('python')
  }
  if (files.some(f => f.endsWith('.rs') || f === 'Cargo.toml')) {
    context.languages.push('rust')
  }
  if (files.some(f => f.endsWith('.go') || f === 'go.mod')) {
    context.languages.push('go')
  }

  // Detect frameworks
  if (existsSync(join(cwd, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (deps.react)
        context.frameworks.push('react')
      if (deps.vue)
        context.frameworks.push('vue')
      if (deps.next)
        context.frameworks.push('next')
      if (deps.nuxt)
        context.frameworks.push('nuxt')
      if (deps.express)
        context.frameworks.push('express')
      if (deps.fastify)
        context.frameworks.push('fastify')
    }
    catch {}
  }

  // Detect tests
  context.hasTests = files.some(f =>
    f.includes('test') || f.includes('spec') || f === 'vitest.config.ts' || f === 'jest.config.js',
  )

  // Detect docs
  context.hasDocs = files.some(f =>
    f.toLowerCase() === 'readme.md' || f === 'docs' || f === 'documentation',
  )

  return context
}

/**
 * Recommend skills based on project context
 */
export function recommendSkillsForContext(context: ProjectContext, skills: CcjkSkill[]): CcjkSkill[] {
  const recommended: CcjkSkill[] = []

  for (const skill of skills) {
    if (!skill.enabled)
      continue

    // Git-related skills
    if (context.hasGit && skill.category === 'git') {
      recommended.push(skill)
    }

    // Language-specific skills
    if (skill.tags) {
      for (const lang of context.languages) {
        if (skill.tags.includes(lang)) {
          recommended.push(skill)
          break
        }
      }
    }

    // Testing skills
    if (context.hasTests && skill.category === 'testing') {
      recommended.push(skill)
    }

    // Documentation skills
    if (!context.hasDocs && skill.category === 'docs') {
      recommended.push(skill)
    }
  }

  return recommended
}
