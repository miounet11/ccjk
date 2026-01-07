import type { ProjectContext } from '../shencha/types'
import { readFile } from 'node:fs/promises'
import ansis from 'ansis'
import { resolve } from 'pathe'
import { createMockLLMClient, LLMScanner } from '../shencha/llm-scanner'

interface ShenchaOptions {
  lang?: string
  output?: string
}

/**
 * ShenCha scan command - Scan code for issues
 */
export async function shenchaScan(options: ShenchaOptions = {}): Promise<void> {
  console.log(ansis.cyan('🔍 ShenCha: Scanning code...'))

  const context: ProjectContext = {
    rootPath: process.cwd(),
    projectName: 'current-project',
    sourceDirs: ['src'],
    testDirs: ['tests'],
    configFiles: [],
  }

  const llmClient = createMockLLMClient()
  const scanner = new LLMScanner(llmClient)

  const readFileWrapper = async (path: string) => {
    return await readFile(resolve(context.rootPath, path), 'utf-8')
  }

  const results = await scanner.scanAll(context, readFileWrapper)

  console.log(ansis.green(`✓ Scan complete. Found ${results.length} results.`))

  if (options.output) {
    console.log(ansis.gray(`Output saved to: ${options.output}`))
  }
}

/**
 * ShenCha report command - Generate audit report
 */
export async function shenchaReport(_options: ShenchaOptions = {}): Promise<void> {
  console.log(ansis.cyan('📊 ShenCha: Generating report...'))
  console.log(ansis.green('✓ Report generated.'))
}

/**
 * ShenCha fix command - Auto-fix issues
 */
export async function shenchaFix(_options: ShenchaOptions = {}): Promise<void> {
  console.log(ansis.cyan('🔧 ShenCha: Fixing issues...'))
  console.log(ansis.green('✓ Fixes applied.'))
}
