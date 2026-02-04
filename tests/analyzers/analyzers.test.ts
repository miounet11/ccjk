/**
 * Tests for the project analysis engine
 */

import fs from 'fs-extra'
import path from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyzeProject, detectProjectType } from '../../src/analyzers/index.js'

describe('project Analysis Engine', () => {
  const testFixturesDir = path.resolve('tests/analyzers/fixtures')
  let tempDir: string

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = path.resolve('tests/analyzers/temp')
    await fs.ensureDir(tempDir)
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir)
  })

  describe('project Type Detection', () => {
    it('should detect Next.js project', async () => {
      const fixturePath = path.join(testFixturesDir, 'nextjs')
      await fs.ensureDir(fixturePath)
      await fs.copy(
        path.join(testFixturesDir, 'package.nextjs.json'),
        path.join(fixturePath, 'package.json'),
      )
      // Create Next.js config file
      await fs.writeFile(path.join(fixturePath, 'next.config.js'), '')
      // Create pages directory
      await fs.ensureDir(path.join(fixturePath, 'pages'))

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.projectType).toBe('next.js')
      expect(analysis.languages.some(l => l.language === 'javascript' || l.language === 'typescript')).toBe(true)
      expect(analysis.frameworks.some(f => f.name === 'next.js')).toBe(true)
      // Note: package manager might not be detected if there's no lock file
    })

    it('should detect React project', async () => {
      const fixturePath = path.join(testFixturesDir, 'react')
      await fs.ensureDir(fixturePath)
      await fs.copy(
        path.join(testFixturesDir, 'package.react.json'),
        path.join(fixturePath, 'package.json'),
      )

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.projectType).toBe('react')
      expect(analysis.frameworks.some(f => f.name === 'react')).toBe(true)
    })

    it('should detect Python Django project', async () => {
      const fixturePath = path.join(testFixturesDir, 'django')
      await fs.ensureDir(fixturePath)
      await fs.copy(
        path.join(testFixturesDir, 'requirements.txt'),
        path.join(fixturePath, 'requirements.txt'),
      )
      // Create Django manage.py
      await fs.writeFile(path.join(fixturePath, 'manage.py'), '#!/usr/bin/env python\n\nimport os')
      // Create Django settings
      await fs.ensureDir(path.join(fixturePath, 'myproject'))
      await fs.writeFile(path.join(fixturePath, 'myproject', 'settings.py'), '')

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      // Django is a framework, so it becomes the project type
      expect(analysis.projectType).toBe('django')
      expect(analysis.frameworks.some(f => f.name === 'django')).toBe(true)
      expect(analysis.frameworks.some(f => f.name === 'celery')).toBe(true)
    })

    it('should detect Go project with Gin', async () => {
      const fixturePath = path.join(testFixturesDir, 'gin')
      await fs.ensureDir(fixturePath)
      await fs.copy(
        path.join(testFixturesDir, 'go.mod'),
        path.join(fixturePath, 'go.mod'),
      )
      // Create Go source file with Gin imports
      await fs.ensureDir(path.join(fixturePath, 'main'))
      await fs.writeFile(path.join(fixturePath, 'main', 'main.go'), `
package main

import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "Hello"})
    })
    r.Run()
}
`)

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.projectType).toBe('go')
      expect(analysis.frameworks.some(f => f.name === 'gin')).toBe(true)
    })

    it('should detect Rust project with Axum', async () => {
      const fixturePath = path.join(testFixturesDir, 'axum')
      await fs.ensureDir(fixturePath)
      await fs.copy(
        path.join(testFixturesDir, 'Cargo.toml'),
        path.join(fixturePath, 'Cargo.toml'),
      )

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.projectType).toBe('rust')
      expect(analysis.frameworks.some(f => f.name === 'axum')).toBe(true)
      expect(analysis.frameworks.some(f => f.name === 'tokio')).toBe(true)
    })
  })

  describe('language Detection', () => {
    it('should detect TypeScript with high confidence', async () => {
      const fixturePath = path.join(tempDir, 'ts-project')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          typescript: '^5.0.0',
        },
      })
      await fs.writeFile(path.join(fixturePath, 'tsconfig.json'), '{}')

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      const tsLanguage = analysis.languages.find(l => l.language === 'typescript')
      expect(tsLanguage).toBeDefined()
      expect(tsLanguage!.confidence).toBeGreaterThan(0.5)
    })

    it('should detect multiple languages in mixed project', async () => {
      const fixturePath = path.join(tempDir, 'mixed-project')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          react: '^18.0.0',
        },
      })
      await fs.writeFile(path.join(fixturePath, 'app.py'), '')
      await fs.writeFile(path.join(fixturePath, 'main.go'), '')

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.languages.length).toBeGreaterThan(1)
    })
  })

  describe('framework Detection', () => {
    it('should detect multiple frameworks', async () => {
      const fixturePath = path.join(tempDir, 'multi-framework')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          'next': '14.1.0',
          'tailwindcss': '^3.3.0',
          '@tanstack/react-query': '^5.0.0',
        },
      })

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.frameworks.some(f => f.name === 'next.js')).toBe(true)
      expect(analysis.frameworks.some(f => f.name === 'tailwindcss')).toBe(true)
    })

    it('should assign correct categories to frameworks', async () => {
      const fixturePath = path.join(tempDir, 'categorized')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0',
          jest: '^29.0.0',
        },
      })

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      const react = analysis.frameworks.find(f => f.name === 'react')
      expect(react?.category).toBe('frontend')

      const express = analysis.frameworks.find(f => f.name === 'express')
      expect(express?.category).toBe('backend')

      const jest = analysis.frameworks.find(f => f.name === 'jest')
      expect(jest?.category).toBe('testing')
    })
  })

  describe('quick Detection', () => {
    it('should quickly detect project type', async () => {
      const fixturePath = path.join(tempDir, 'quick-detect')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          next: '14.1.0',
        },
      })
      // Create Next.js config file
      await fs.writeFile(path.join(fixturePath, 'next.config.js'), '')
      // Create pages directory
      await fs.ensureDir(path.join(fixturePath, 'pages'))

      const projectType = await detectProjectType(fixturePath)
      expect(projectType).toBe('next.js')
    })
  })

  describe('confidence Calculation', () => {
    it('should have high confidence for clear projects', async () => {
      const fixturePath = path.join(tempDir, 'clear-project')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          'next': '14.1.0',
          'react': '^18.0.0',
          'react-dom': '^18.0.0',
        },
      })

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.metadata.confidence).toBeGreaterThan(0.7)
    })

    it('should have lower confidence for ambiguous projects', async () => {
      const fixturePath = path.join(tempDir, 'ambiguous-project')
      await fs.ensureDir(fixturePath)
      await fs.writeFile(path.join(fixturePath, 'index.js'), '')
      await fs.writeFile(path.join(fixturePath, 'app.py'), '')
      await fs.writeFile(path.join(fixturePath, 'main.go'), '')

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.metadata.confidence).toBeLessThan(0.7)
    })
  })

  describe('edge Cases', () => {
    it('should handle empty projects gracefully', async () => {
      const fixturePath = path.join(tempDir, 'empty-project')
      await fs.ensureDir(fixturePath)

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.projectType).toBe('unknown')
      expect(analysis.languages).toHaveLength(0)
    })

    it('should handle missing package manager files', async () => {
      const fixturePath = path.join(tempDir, 'no-package-manager')
      await fs.ensureDir(fixturePath)
      await fs.writeFile(path.join(fixturePath, 'README.md'), '# Test Project')

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.packageManager).toBeUndefined()
    })

    it('should handle projects with many files', async () => {
      const fixturePath = path.join(tempDir, 'many-files')
      await fs.ensureDir(fixturePath)
      await fs.writeJson(path.join(fixturePath, 'package.json'), {
        dependencies: {
          react: '^18.0.0',
        },
      })

      // Create many files
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(path.join(fixturePath, `file${i}.js`), '')
      }

      const analysis = await analyzeProject(fixturePath, {
        analyzeTransitiveDeps: false,
      })

      expect(analysis.metadata.filesScanned).toBeGreaterThan(0)
    })
  })
})
