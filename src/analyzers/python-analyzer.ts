/**
 * Python project analyzer
 * Detects frameworks like Django, FastAPI, Flask, etc.
 */

import type { FrameworkDetectionResult, LanguageDetection } from './types.js'
import consola from 'consola'
import { promises as fsp } from 'node:fs'
import path from 'pathe'
import { parse } from 'smol-toml'

// fs-extra compatibility helpers
async function pathExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p)
    return true
  }
  catch {
    return false
  }
}

async function readFile(p: string): Promise<string> {
  return fsp.readFile(p, 'utf-8')
}

const logger = consola.withTag('python-analyzer')

// Python framework detection patterns
const FRAMEWORK_PATTERNS = {
  'django': {
    files: ['manage.py', 'settings.py'],
    dependencies: ['django'],
    indicators: ['manage.py', 'wsgi.py', 'asgi.py', 'settings/', 'templates/', 'static/'],
  },
  'fastapi': {
    files: ['main.py'],
    dependencies: ['fastapi'],
    indicators: ['main.py', 'app/', 'api/', 'routers/'],
  },
  'flask': {
    files: ['app.py', 'wsgi.py'],
    dependencies: ['flask'],
    indicators: ['app.py', 'app/', 'templates/', 'static/'],
  },
  'tornado': {
    files: [],
    dependencies: ['tornado'],
    indicators: ['tornado', 'handlers/'],
  },
  'sanic': {
    files: [],
    dependencies: ['sanic'],
    indicators: ['sanic'],
  },
  'quart': {
    files: [],
    dependencies: ['quart'],
    indicators: ['quart'],
  },
  'falcon': {
    files: [],
    dependencies: ['falcon'],
    indicators: ['falcon'],
  },
  'bottle': {
    files: [],
    dependencies: ['bottle'],
    indicators: ['bottle'],
  },
  'pyramid': {
    files: ['development.ini', 'production.ini'],
    dependencies: ['pyramid'],
    indicators: ['development.ini', 'production.ini'],
  },
  'starlette': {
    files: [],
    dependencies: ['starlette'],
    indicators: ['starlette'],
  },
  'celery': {
    files: ['celery.py'],
    dependencies: ['celery'],
    indicators: ['celery.py', 'tasks.py', 'celeryconfig.py'],
  },
  'pandas': {
    files: [],
    dependencies: ['pandas'],
    indicators: ['pandas'],
  },
  'numpy': {
    files: [],
    dependencies: ['numpy'],
    indicators: ['numpy'],
  },
  'scikit-learn': {
    files: [],
    dependencies: ['scikit-learn'],
    indicators: ['sklearn'],
  },
  'tensorflow': {
    files: [],
    dependencies: ['tensorflow'],
    indicators: ['tensorflow'],
  },
  'pytorch': {
    files: [],
    dependencies: ['torch'],
    indicators: ['torch'],
  },
  'jupyter': {
    files: [],
    dependencies: ['jupyter'],
    indicators: ['.ipynb', 'jupyter'],
  },
  'streamlit': {
    files: [],
    dependencies: ['streamlit'],
    indicators: ['streamlit'],
  },
  'dash': {
    files: [],
    dependencies: ['dash'],
    indicators: ['dash'],
  },
  'gradio': {
    files: [],
    dependencies: ['gradio'],
    indicators: ['gradio'],
  },
  'pytest': {
    files: [],
    dependencies: ['pytest'],
    indicators: ['pytest', 'conftest.py', 'test_'],
  },
  'unittest': {
    files: [],
    dependencies: [],
    indicators: ['test_', '_test.py'],
  },
  'poetry': {
    files: ['pyproject.toml'],
    dependencies: [],
    indicators: ['pyproject.toml', 'poetry.lock'],
  },
  'pipenv': {
    files: ['Pipfile'],
    dependencies: [],
    indicators: ['Pipfile', 'Pipfile.lock'],
  },
  'conda': {
    files: ['environment.yml', 'environment.yaml'],
    dependencies: [],
    indicators: ['environment.yml', 'environment.yaml'],
  },
}

/**
 * Analyze Python project
 */
export async function analyzePythonProject(
  projectPath: string,
  files: string[],
  languages: LanguageDetection[],
): Promise<FrameworkDetectionResult[]> {
  logger.info('Analyzing Python project')

  const frameworks: FrameworkDetectionResult[] = []

  // Analyze different dependency files
  const dependencies = await analyzeDependencies(projectPath, files)

  // Check for each framework
  for (const [frameworkName, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence: string[] = []
    let confidence = 0

    // Check for framework-specific files
    for (const file of patterns.files) {
      if (files.includes(file) || files.some(f => f.includes(file))) {
        evidence.push(`Found ${file}`)
        confidence += 0.3
      }
    }

    // Check for directory indicators
    for (const indicator of patterns.indicators) {
      if (files.some(f => f.includes(indicator))) {
        evidence.push(`Found ${indicator} pattern`)
        confidence += 0.2
      }
    }

    // Check dependencies
    for (const dep of patterns.dependencies) {
      if (dependencies[dep]) {
        evidence.push(`Found ${dep} in dependencies`)
        confidence += 0.4
      }
    }

    // Add framework if detected
    if (confidence > 0) {
      frameworks.push({
        name: frameworkName,
        category: getFrameworkCategory(frameworkName),
        version: dependencies[frameworkName],
        confidence: Math.min(confidence, 1),
        evidence,
      })
    }
  }

  // Detect additional patterns
  await detectAdditionalPatterns(projectPath, files, frameworks, dependencies)

  // Sort by confidence
  frameworks.sort((a, b) => b.confidence - a.confidence)

  logger.debug(`Detected frameworks: ${frameworks.map(f => `${f.name} (${Math.round(f.confidence * 100)}%)`).join(', ')}`)

  return frameworks
}

/**
 * Analyze Python dependencies
 */
async function analyzeDependencies(
  projectPath: string,
  files: string[],
): Promise<Record<string, string>> {
  const dependencies: Record<string, string> = {}

  // Check requirements.txt
  const requirementsPath = path.join(projectPath, 'requirements.txt')
  if (files.includes('requirements.txt') && await pathExists(requirementsPath)) {
    try {
      const content = await fsp.readFile(requirementsPath, 'utf-8')
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          // Parse requirement
          const match = trimmed.match(/^([\w-]+)([[~=><].*)?$/)
          if (match) {
            dependencies[match[1]] = match[2] || 'latest'
          }
        }
      }
    }
    catch (error) {
      logger.warn('Failed to parse requirements.txt:', error)
    }
  }

  // Check pyproject.toml
  const pyprojectPath = path.join(projectPath, 'pyproject.toml')
  if (files.includes('pyproject.toml') && await pathExists(pyprojectPath)) {
    try {
      const content = await fsp.readFile(pyprojectPath, 'utf-8')
      const parsed = parse(content)

      // Poetry dependencies
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'tool' in parsed) {
        const tool = parsed.tool
        if (typeof tool === 'object' && tool !== null && !Array.isArray(tool) && 'poetry' in tool) {
          const poetry = tool.poetry
          if (typeof poetry === 'object' && poetry !== null && !Array.isArray(poetry) && 'dependencies' in poetry) {
            const poetryDeps = poetry.dependencies
            if (typeof poetryDeps === 'object' && poetryDeps !== null && !Array.isArray(poetryDeps)) {
              Object.assign(dependencies, poetryDeps)
            }
          }
        }
      }

      // Project dependencies
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'project' in parsed) {
        const project = parsed.project
        if (typeof project === 'object' && project !== null && !Array.isArray(project) && 'dependencies' in project) {
          const projectDeps = project.dependencies
          if (Array.isArray(projectDeps)) {
            for (const dep of projectDeps) {
              if (typeof dep === 'string') {
                const match = dep.match(/^([\w-]+)([[~=><].*)?$/)
                if (match) {
                  dependencies[match[1]] = match[2] || 'latest'
                }
              }
            }
          }
        }
      }
    }
    catch (error) {
      logger.warn('Failed to parse pyproject.toml:', error)
    }
  }

  // Check Pipfile
  const pipfilePath = path.join(projectPath, 'Pipfile')
  if (files.includes('Pipfile') && await pathExists(pipfilePath)) {
    try {
      const content = await fsp.readFile(pipfilePath, 'utf-8')
      const lines = content.split('\n')
      let inPackages = false

      for (const line of lines) {
        const trimmed = line.trim()

        if (trimmed === '[packages]') {
          inPackages = true
          continue
        }

        if (trimmed.startsWith('[') && trimmed !== '[packages]') {
          inPackages = false
          continue
        }

        if (inPackages && trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([\w-]+)\s*=\s*"?([^"]*)"?/)
          if (match) {
            dependencies[match[1]] = match[2] || 'latest'
          }
        }
      }
    }
    catch (error) {
      logger.warn('Failed to parse Pipfile:', error)
    }
  }

  // Check setup.py
  const setupPath = path.join(projectPath, 'setup.py')
  if (files.includes('setup.py') && await pathExists(setupPath)) {
    try {
      const content = await fsp.readFile(setupPath, 'utf-8')

      // Simple regex to find install_requires
      const installRequiresMatch = content.match(/install_requires\s*=\s*\[([\s\S]*?)\]/)
      if (installRequiresMatch) {
        const requiresList = installRequiresMatch[1]
        const requires = requiresList.match(/['"`]([\w-]+)/g)

        if (requires) {
          for (const req of requires) {
            const name = req.replace(/['"`]/g, '')
            dependencies[name] = 'latest'
          }
        }
      }
    }
    catch (error) {
      logger.warn('Failed to parse setup.py:', error)
    }
  }

  // Check environment.yml
  const envPath = path.join(projectPath, 'environment.yml')
  if (files.includes('environment.yml') && await pathExists(envPath)) {
    try {
      const content = await fsp.readFile(envPath, 'utf-8')
      const parsed = parse(content)

      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && 'dependencies' in parsed) {
        const deps = parsed.dependencies
        if (Array.isArray(deps)) {
          for (const dep of deps) {
            if (typeof dep === 'string') {
              const match = dep.match(/^([\w-]+)([[~=><].*)?$/)
              if (match) {
                dependencies[match[1]] = match[2] || 'latest'
              }
            }
          }
        }
      }
    }
    catch (error) {
      logger.warn('Failed to parse environment.yml:', error)
    }
  }

  return dependencies
}

/**
 * Get framework category
 */
function getFrameworkCategory(framework: string): string {
  const categories = {
    web: [
      'django',
      'fastapi',
      'flask',
      'tornado',
      'sanic',
      'quart',
      'falcon',
      'bottle',
      'pyramid',
      'starlette',
    ],
    async: ['celery'],
    data: ['pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch'],
    notebook: ['jupyter'],
    ui: ['streamlit', 'dash', 'gradio'],
    testing: ['pytest', 'unittest'],
    package: ['poetry', 'pipenv', 'conda'],
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
  dependencies: Record<string, string>,
): Promise<void> {
  // Check for Python version
  const pythonVersionPath = path.join(projectPath, '.python-version')
  if (files.includes('.python-version') && await pathExists(pythonVersionPath)) {
    try {
      const version = await fsp.readFile(pythonVersionPath, 'utf-8')
      frameworks.push({
        name: 'python',
        category: 'language',
        version: version.trim(),
        confidence: 0.9,
        evidence: ['Found .python-version'],
      })
    }
    catch (error) {
      logger.warn('Failed to read .python-version:', error)
    }
  }

  // Check for Docker
  const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']
  for (const file of dockerFiles) {
    if (files.includes(file)) {
      frameworks.push({
        name: 'docker',
        category: 'deployment',
        confidence: 0.9,
        evidence: [`Found ${file}`],
      })
    }
  }

  // Check for testing patterns
  if (files.some(f => f.startsWith('test_') || f.includes('_test.py'))) {
    frameworks.push({
      name: 'unittest',
      category: 'testing',
      confidence: 0.6,
      evidence: ['Found test files'],
    })
  }

  // Check for linting tools
  const lintingTools = ['flake8', 'pylint', 'black', 'isort', 'mypy']
  for (const tool of lintingTools) {
    if (dependencies[tool]) {
      frameworks.push({
        name: tool,
        category: 'linting',
        version: dependencies[tool],
        confidence: 0.8,
        evidence: [`Found ${tool} in dependencies`],
      })
    }
  }

  // Check for configuration files
  const configFiles = {
    'setup.cfg': 'setuptools',
    'tox.ini': 'tox',
    'mypy.ini': 'mypy',
    '.flake8': 'flake8',
    '.pylintrc': 'pylint',
    'pytest.ini': 'pytest',
    'pyproject.toml': 'modern-python',
  }

  for (const [file, tool] of Object.entries(configFiles)) {
    if (files.includes(file)) {
      frameworks.push({
        name: tool,
        category: 'config',
        confidence: 0.8,
        evidence: [`Found ${file}`],
      })
    }
  }
}
