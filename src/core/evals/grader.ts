import type { EvalAssertion, EvalAssertionResult, EvalRunResult, EvalScenario } from './types.js'
import { existsSync, readFileSync } from 'node:fs'

export function gradeRun(scenario: EvalScenario, result: EvalRunResult): EvalRunResult {
  const assertionResults: EvalAssertionResult[] = []

  for (const assertion of scenario.assertions) {
    const assertionResult = evaluateAssertion(assertion, result)
    assertionResults.push(assertionResult)
  }

  const success = assertionResults.every(r => r.success)

  return {
    ...result,
    success,
    assertionResults,
  }
}

function evaluateAssertion(assertion: EvalAssertion, result: EvalRunResult): EvalAssertionResult {
  switch (assertion.type) {
    case 'exit_code':
      return checkExitCode(assertion, result)
    case 'file_exists':
      return checkFileExists(assertion)
    case 'contains_text':
      return checkContainsText(assertion)
    default:
      return {
        type: assertion.type,
        success: false,
        message: `Unknown assertion type: ${assertion.type}`,
      }
  }
}

function checkExitCode(assertion: EvalAssertion, result: EvalRunResult): EvalAssertionResult {
  const expected = assertion.expected ?? 0
  const success = result.exitCode === expected

  return {
    type: 'exit_code',
    success,
    message: success
      ? `Exit code ${result.exitCode} matches expected ${expected}`
      : `Exit code ${result.exitCode} does not match expected ${expected}`,
  }
}

function checkFileExists(assertion: EvalAssertion): EvalAssertionResult {
  if (!assertion.path) {
    return {
      type: 'file_exists',
      success: false,
      message: 'Missing path for file_exists assertion',
    }
  }

  const exists = existsSync(assertion.path)

  return {
    type: 'file_exists',
    success: exists,
    message: exists
      ? `File exists: ${assertion.path}`
      : `File does not exist: ${assertion.path}`,
  }
}

function checkContainsText(assertion: EvalAssertion): EvalAssertionResult {
  if (!assertion.path) {
    return {
      type: 'contains_text',
      success: false,
      message: 'Missing path for contains_text assertion',
    }
  }

  if (!assertion.value) {
    return {
      type: 'contains_text',
      success: false,
      message: 'Missing value for contains_text assertion',
    }
  }

  if (!existsSync(assertion.path)) {
    return {
      type: 'contains_text',
      success: false,
      message: `File does not exist: ${assertion.path}`,
    }
  }

  const content = readFileSync(assertion.path, 'utf-8')
  const contains = content.includes(assertion.value)

  return {
    type: 'contains_text',
    success: contains,
    message: contains
      ? `File contains text: "${assertion.value}"`
      : `File does not contain text: "${assertion.value}"`,
  }
}
