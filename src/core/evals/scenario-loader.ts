import type { EvalScenario } from './types.js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

export function loadScenarios(scenariosDir: string, filter?: { suite?: string, id?: string }): EvalScenario[] {
  const scenarios: EvalScenario[] = []

  function scanDir(dir: string) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        scanDir(fullPath)
      }
      else if (extname(entry) === '.json') {
        try {
          const content = readFileSync(fullPath, 'utf-8')
          const scenario = JSON.parse(content) as EvalScenario

          validateScenario(scenario, fullPath)

          if (filter?.suite && scenario.suite !== filter.suite)
            continue
          if (filter?.id && scenario.id !== filter.id)
            continue

          scenarios.push(scenario)
        }
        catch (err) {
          throw new Error(`Failed to load scenario from ${fullPath}: ${err}`)
        }
      }
    }
  }

  scanDir(scenariosDir)
  return scenarios
}

function validateScenario(scenario: any, path: string): asserts scenario is EvalScenario {
  const required = ['id', 'suite', 'description', 'command', 'assertions']
  for (const field of required) {
    if (!scenario[field]) {
      throw new Error(`Scenario ${path} missing required field: ${field}`)
    }
  }

  if (!Array.isArray(scenario.assertions)) {
    throw new TypeError(`Scenario ${path} assertions must be an array`)
  }

  for (const assertion of scenario.assertions) {
    if (!assertion.type) {
      throw new Error(`Scenario ${path} has assertion without type`)
    }
  }
}
