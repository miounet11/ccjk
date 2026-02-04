/**
 * TypeScript/JavaScript project analyzer
 * Detects frameworks like React, Next.js, Vue, Angular, NestJS, etc.
 */

import type { FrameworkDetectionResult, LanguageDetection } from './types.js'
import consola from 'consola'
import fs from 'fs-extra'
import path from 'pathe'

const logger = consola.withTag('typescript-analyzer')

// Framework detection patterns
const FRAMEWORK_PATTERNS = {
  'next.js': {
    files: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
    dependencies: ['next'],
    indicators: ['pages/', 'app/', 'src/app/', 'src/pages/'],
  },
  'nuxt': {
    files: ['nuxt.config.js', 'nuxt.config.ts'],
    dependencies: ['nuxt'],
    indicators: ['pages/', 'layouts/', 'components/', 'store/'],
  },
  'sveltekit': {
    files: ['svelte.config.js', 'svelte.config.ts'],
    dependencies: ['@sveltejs/kit'],
    indicators: ['src/routes/', 'src/lib/', '.svelte-kit/'],
  },
  'astro': {
    files: ['astro.config.js', 'astro.config.mjs', 'astro.config.ts'],
    dependencies: ['astro'],
    indicators: ['src/pages/', 'src/content/', 'src/components/'],
  },
  'solidstart': {
    files: ['vite.config.ts', 'vite.config.js'],
    dependencies: ['solid-start'],
    indicators: ['src/routes/', 'src/components/'],
  },
  'qwik': {
    files: ['vite.config.ts'],
    dependencies: ['@builder.io/qwik'],
    indicators: ['src/routes/', 'src/components/'],
  },
  'remix': {
    files: ['remix.config.js', 'vite.config.ts'],
    dependencies: ['@remix-run/node'],
    indicators: ['app/', 'app/routes/', 'app/components/'],
  },
  'gatsby': {
    files: ['gatsby-config.js', 'gatsby-config.ts'],
    dependencies: ['gatsby'],
    indicators: ['src/pages/', 'src/templates/', 'gatsby-node.js'],
  },
  'vue': {
    files: ['vue.config.js'],
    dependencies: ['vue'],
    indicators: ['src/components/', 'src/views/', 'src/router/'],
  },
  'angular': {
    files: ['angular.json'],
    dependencies: ['@angular/core'],
    indicators: ['src/app/', 'e2e/', '.angular/'],
  },
  'react': {
    files: [],
    dependencies: ['react', 'react-dom'],
    indicators: ['src/', 'components/', 'src/components/'],
  },
  'preact': {
    files: [],
    dependencies: ['preact'],
    indicators: ['src/', 'components/'],
  },
  'solidjs': {
    files: [],
    dependencies: ['solid-js'],
    indicators: ['src/', 'components/'],
  },
  'svelte': {
    files: [],
    dependencies: ['svelte'],
    indicators: ['src/', 'components/', 'src/components/'],
  },
  'nest.js': {
    files: ['nest-cli.json'],
    dependencies: ['@nestjs/core'],
    indicators: ['src/', 'src/modules/', 'src/controllers/'],
  },
  'express': {
    files: [],
    dependencies: ['express'],
    indicators: ['app.js', 'server.js', 'routes/', 'middleware/'],
  },
  'fastify': {
    files: [],
    dependencies: ['fastify'],
    indicators: ['app.js', 'server.js', 'routes/', 'plugins/'],
  },
  'koa': {
    files: [],
    dependencies: ['koa'],
    indicators: ['app.js', 'server.js', 'middleware/'],
  },
  'adonisjs': {
    files: ['.adonisrc.json'],
    dependencies: ['@adonisjs/core'],
    indicators: ['app/', 'config/', 'start/', 'providers/'],
  },
  'feathers': {
    files: [],
    dependencies: ['@feathersjs/feathers'],
    indicators: ['src/', 'services/'],
  },
  'meteor': {
    files: ['.meteor/'],
    dependencies: ['meteor-node-stubs'],
    indicators: ['client/', 'server/', 'imports/'],
  },
  'ionic': {
    files: ['ionic.config.json'],
    dependencies: ['@ionic/core'],
    indicators: ['src/', 'www/'],
  },
  'electron': {
    files: [],
    dependencies: ['electron'],
    indicators: ['main.js', 'src/main/', 'electron/'],
  },
  'turborepo': {
    files: ['turbo.json'],
    dependencies: ['turbo'],
    indicators: ['apps/', 'packages/'],
  },
  'nx': {
    files: ['nx.json'],
    dependencies: ['nx'],
    indicators: ['apps/', 'libs/'],
  },
  'lerna': {
    files: ['lerna.json'],
    dependencies: ['lerna'],
    indicators: ['packages/'],
  },
}

/**
 * Analyze TypeScript/JavaScript project
 */
export async function analyzeTypeScriptProject(
  projectPath: string,
  files: string[],
  languages: LanguageDetection[],
): Promise<FrameworkDetectionResult[]> {
  logger.info('Analyzing TypeScript/JavaScript project')

  const frameworks: FrameworkDetectionResult[] = []
  const packageJsonPath = path.join(projectPath, 'package.json')

  // Read package.json
  let packageJson: any = null
  try {
    if (await fs.pathExists(packageJsonPath)) {
      packageJson = await fs.readJson(packageJsonPath)
    }
  }
  catch (error) {
    logger.warn('Failed to read package.json:', error)
  }

  // Check for each framework
  for (const [frameworkName, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence: string[] = []
    let confidence = 0

    // Check for framework-specific files
    for (const file of patterns.files) {
      if (files.includes(file)) {
        evidence.push(`Found ${file}`)
        confidence += 0.3
      }
    }

    // Check for directory indicators
    for (const indicator of patterns.indicators) {
      const indicatorPath = path.join(projectPath, indicator)
      if (files.some(f => f.startsWith(indicator)) || await fs.pathExists(indicatorPath)) {
        evidence.push(`Found ${indicator} directory`)
        confidence += 0.2
      }
    }

    // Check dependencies
    if (packageJson) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      for (const dep of patterns.dependencies) {
        if (allDeps[dep]) {
          evidence.push(`Found ${dep} in dependencies`)
          confidence += 0.4
        }
      }
    }

    // Add framework if detected
    if (confidence > 0) {
      // Get version if available
      let version: string | undefined
      if (packageJson) {
        for (const dep of patterns.dependencies) {
          const depVersion = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
          if (depVersion) {
            version = depVersion
            break
          }
        }
      }

      frameworks.push({
        name: frameworkName,
        category: getFrameworkCategory(frameworkName),
        version,
        confidence: Math.min(confidence, 1),
        evidence,
      })
    }
  }

  // Detect additional patterns
  await detectAdditionalPatterns(projectPath, files, frameworks, packageJson)

  // Sort by confidence
  frameworks.sort((a, b) => b.confidence - a.confidence)

  logger.debug(`Detected frameworks: ${frameworks.map(f => `${f.name} (${Math.round(f.confidence * 100)}%)`).join(', ')}`)

  return frameworks
}

/**
 * Get framework category
 */
function getFrameworkCategory(framework: string): string {
  const categories = {
    frontend: [
      'next.js',
      'nuxt',
      'sveltekit',
      'astro',
      'solidstart',
      'qwik',
      'remix',
      'gatsby',
      'vue',
      'angular',
      'react',
      'preact',
      'solidjs',
      'svelte',
      'ionic',
    ],
    backend: [
      'nest.js',
      'express',
      'fastify',
      'koa',
      'adonisjs',
      'feathers',
      'meteor',
    ],
    desktop: ['electron'],
    monorepo: ['turborepo', 'nx', 'lerna'],
  }

  for (const [category, frameworks] of Object.entries(categories)) {
    if (frameworks.includes(framework)) {
      return category
    }
  }

  return 'other'
}

/**
 * Detect additional patterns
 */
async function detectAdditionalPatterns(
  projectPath: string,
  files: string[],
  frameworks: FrameworkDetectionResult[],
  packageJson: any,
): Promise<void> {
  // Check for TypeScript
  if (files.includes('tsconfig.json')) {
    const tsFramework = frameworks.find(f => f.name === 'typescript')
    if (!tsFramework) {
      frameworks.push({
        name: 'typescript',
        category: 'language',
        confidence: 0.9,
        evidence: ['Found tsconfig.json'],
      })
    }
  }

  // Check for testing frameworks
  const testDependencies = ['jest', 'vitest', 'cypress', 'playwright', 'mocha', 'jasmine']
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    for (const testDep of testDependencies) {
      if (allDeps[testDep]) {
        frameworks.push({
          name: testDep,
          category: 'testing',
          version: allDeps[testDep],
          confidence: 0.8,
          evidence: [`Found ${testDep} in dependencies`],
        })
      }
    }
  }

  // Check for CSS frameworks
  const cssFrameworks = ['tailwindcss', 'bootstrap', 'bulma', 'material-ui', 'chakra-ui']
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    for (const cssFw of cssFrameworks) {
      if (allDeps[cssFw]) {
        frameworks.push({
          name: cssFw,
          category: 'css',
          version: allDeps[cssFw],
          confidence: 0.8,
          evidence: [`Found ${cssFw} in dependencies`],
        })
      }
    }
  }

  // Check for state management
  const stateLibs = ['redux', 'zustand', 'recoil', 'jotai', 'valtio']
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    for (const lib of stateLibs) {
      if (allDeps[lib]) {
        frameworks.push({
          name: lib,
          category: 'state-management',
          version: allDeps[lib],
          confidence: 0.8,
          evidence: [`Found ${lib} in dependencies`],
        })
      }
    }
  }

  // Check for linting/formatting
  const lintingTools = ['eslint', 'prettier', 'biome', 'rome']
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    for (const tool of lintingTools) {
      if (allDeps[tool]) {
        frameworks.push({
          name: tool,
          category: 'linting',
          version: allDeps[tool],
          confidence: 0.8,
          evidence: [`Found ${tool} in dependencies`],
        })
      }
    }
  }

  // Check for deployment platforms
  const deploymentFiles = {
    'vercel.json': 'vercel',
    'netlify.toml': 'netlify',
    'app.yaml': 'app-engine',
    'now.json': 'now',
  }

  for (const [file, platform] of Object.entries(deploymentFiles)) {
    if (files.includes(file)) {
      frameworks.push({
        name: platform,
        category: 'deployment',
        confidence: 0.9,
        evidence: [`Found ${file}`],
      })
    }
  }
}
