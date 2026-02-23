import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { dirname, join } from 'pathe'

interface RuntimePackageMetadata {
  version?: string
  homepage?: string
}

let cachedMetadata: RuntimePackageMetadata | null = null

function readRuntimePackageMetadata(): RuntimePackageMetadata {
  if (cachedMetadata) {
    return cachedMetadata
  }

  const currentDir = dirname(fileURLToPath(import.meta.url))
  const candidatePaths = [
    join(currentDir, '../../package.json'),
    join(currentDir, '../package.json'),
    join(process.cwd(), 'package.json'),
  ]

  for (const packagePath of candidatePaths) {
    if (!existsSync(packagePath)) {
      continue
    }

    try {
      const parsed = JSON.parse(readFileSync(packagePath, 'utf-8')) as RuntimePackageMetadata
      cachedMetadata = parsed
      return parsed
    }
    catch {
    }
  }

  cachedMetadata = {}
  return cachedMetadata
}

export function getRuntimeVersion(): string {
  return readRuntimePackageMetadata().version || '0.0.0'
}

export function getRuntimeHomepage(): string {
  return readRuntimePackageMetadata().homepage || 'https://github.com/miounet11/ccjk'
}
